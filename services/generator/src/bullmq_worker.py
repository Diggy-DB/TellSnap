"""
BullMQ Worker for processing comic generation jobs from NestJS.

This worker connects to the same Redis queue that NestJS uses
and processes comic/manga page generation jobs.
Uses Google Firestore for database and Google Cloud Storage for files.
"""

import asyncio
import json
import os
import sys
from typing import Any
from bullmq import Worker, Job
import structlog

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import get_settings
from src.services.firestore_db import FirestoreService
from src.services.gcs_storage import GCSStorageService
from src.services.script_expander import ScriptExpander, PreviousSegment
from src.services.comic_generator import ComicGenerator

logger = structlog.get_logger()
settings = get_settings()


def update_progress(db: FirestoreService, job_id: str, progress: int, stage: str):
    """Update job progress in database."""
    db.update_job(job_id, {
        "progress": progress,
        "stage": stage,
    })


async def process_generation_job(job: Job, token: str) -> dict:
    """
    Process a comic generation job.
    
    Pipeline:
    1. Fetch segment and scene context from Firestore
    2. Expand script via OpenAI ChatGPT into panel descriptions
    3. Generate comic panels via Google Imagen 3
    4. Compose into a comic page
    5. Upload to Google Cloud Storage
    6. Update Firestore
    """
    data = job.data
    job_id = data.get("jobId")
    scene_id = data.get("sceneId")
    segment_id = data.get("segmentId")
    user_prompt = data.get("prompt", "")
    comic_style = data.get("comicStyle", "manga")  # manga, manhwa, western_comic, webtoon

    log = logger.bind(job_id=job_id, scene_id=scene_id, segment_id=segment_id)
    log.info("Processing comic generation job", style=comic_style)

    db = FirestoreService()
    storage = GCSStorageService()

    try:
        # Update job status to PROCESSING
        db.update_job(job_id, {"status": "PROCESSING"})
        db.update_segment(segment_id, {"status": "PROCESSING"})

        # Get segment and scene data
        segment = db.get_segment(segment_id)
        scene = db.get_scene(scene_id)

        if not segment or not scene:
            raise ValueError(f"Missing segment or scene data")

        user_prompt = segment.get("prompt", user_prompt)
        topic_id = scene.get("topic_id") or (scene.get("topic", {}).get("id") if scene.get("topic") else None)

        # Get scene bible for continuity
        scene_bible = db.get_scene_bible(scene_id)

        # Get previous segments for context
        previous_segments = db.get_segments_before(scene_id, segment.get("order_index", 0))
        prev_segment_objs = [
            PreviousSegment(
                order_index=s["order_index"],
                prompt=s.get("prompt", ""),
                expanded_script=s.get("expanded_script"),
                image_url=s.get("image_url"),
            )
            for s in previous_segments
        ]

        # Build scene context
        scene_context = {
            "title": scene.get("title", ""),
            "description": scene.get("description", ""),
            "topic": scene.get("topic", {}).get("title", "") if scene.get("topic") else "",
        }

        # Stage 1: Script Expansion via OpenAI ChatGPT
        log.info("Stage 1: Script expansion via OpenAI")
        update_progress(db, job_id, 10, "script_expanding")

        expander = ScriptExpander()
        expanded = expander.expand(
            user_prompt=user_prompt,
            scene_context=scene_context,
            scene_bible=scene_bible,
            previous_segments=prev_segment_objs,
            comic_style=comic_style,
        )

        # Save expanded script and genre
        db.update_segment(segment_id, {
            "expanded_script": expanded.full_script,
            "genre": expanded.genre,
        })
        
        # Update scene with detected genre (if this is the first segment)
        db.update_scene(scene_id, {
            "genre": expanded.genre,
        })
        
        update_progress(db, job_id, 25, "script_expanded")

        log.info(
            "Script expanded successfully",
            num_panels=len(expanded.panels),
            layout=expanded.panel_layout,
        )

        # Stage 2: Comic Panel Generation via Google Imagen 3
        log.info("Stage 2: Comic generation via Google Imagen 3")
        update_progress(db, job_id, 30, "comic_generating")

        # Prepare panel prompts for the generator
        panel_prompts = [
            {
                "description": panel.description,
                "dialogue": panel.dialogue,
                "action": panel.action,
                "emotion": panel.emotion,
            }
            for panel in expanded.panels
        ]

        comic_generator = ComicGenerator()
        comic_result = comic_generator.generate(
            panel_prompts=panel_prompts,
            scene_bible=scene_bible,
            style=comic_style,
            page_layout=expanded.panel_layout,
            aspect_ratio="9:16",  # Portrait for manga/manhwa
            user_prompt=user_prompt,  # Pass original prompt for better accuracy
        )

        update_progress(db, job_id, 70, "comic_generated")
        log.info("Comic page generated", page_path=str(comic_result.page_path), num_panels=comic_result.num_panels)

        # Stage 3: Upload to Google Cloud Storage
        log.info("Stage 3: Uploading to Google Cloud Storage")
        update_progress(db, job_id, 80, "uploading")

        upload_result = storage.upload_comic_page(
            segment_id=segment_id,
            scene_id=scene_id,
            image_path=comic_result.page_path,
            thumbnail_path=comic_result.thumbnail_path,
        )
        
        image_url = upload_result.image_url
        thumbnail_url = upload_result.thumbnail_url

        # Upload individual panels for potential reuse
        for idx, panel_path in enumerate(comic_result.panel_paths):
            panel_key = f"scenes/{scene_id}/segments/{segment_id}/panel_{idx}.png"
            storage.upload_image(panel_path, panel_key)

        update_progress(db, job_id, 90, "uploaded")

        # Stage 4: Finalize
        log.info("Stage 4: Finalizing")
        update_progress(db, job_id, 95, "finalizing")

        # Update segment with image URLs
        db.update_segment(segment_id, {
            "status": "COMPLETED",
            "imageUrl": image_url,
            "thumbnailUrl": thumbnail_url,
            "numPanels": comic_result.num_panels,
        })

        # Update job as completed
        db.update_job(job_id, {
            "status": "COMPLETED",
            "progress": 100,
            "stage": "completed",
            "result": json.dumps({
                "image_url": image_url,
                "thumbnail_url": thumbnail_url,
                "num_panels": comic_result.num_panels,
                "style": comic_result.style,
            }),
        })

        log.info("Job completed successfully", image_url=image_url)

        return {
            "success": True,
            "image_url": image_url,
            "thumbnail_url": thumbnail_url,
            "num_panels": comic_result.num_panels,
        }

    except Exception as e:
        log.error("Job failed", error=str(e))
        
        # Update job and segment as failed
        db.update_job(job_id, {
            "status": "FAILED",
            "error": str(e),
        })
        db.update_segment(segment_id, {
            "status": "FAILED",
        })
        
        raise


async def main():
    """Start the BullMQ worker."""
    logger.info("Starting BullMQ worker for comic generation", redis_url=settings.redis_url)

    # Parse Redis URL for connection
    # Format: redis://localhost:6379
    redis_host = "localhost"
    redis_port = 6379
    
    if settings.redis_url:
        parts = settings.redis_url.replace("redis://", "").split(":")
        redis_host = parts[0] if parts else "localhost"
        redis_port = int(parts[1].split("/")[0]) if len(parts) > 1 else 6379

    # Track processed job IDs to prevent reprocessing
    processed_jobs = set()

    async def process_job_wrapper(job: Job, token: str) -> dict:
        """Wrapper to track processed jobs and prevent duplicates."""
        job_id = job.data.get("jobId")
        
        # Skip if already processed
        if job_id in processed_jobs:
            logger.info(f"Skipping already processed job", job_id=job_id)
            return {"status": "skipped", "reason": "already_processed"}
        
        # Also check Firestore status
        db = FirestoreService()
        existing_job = db.get_job(job_id)
        if existing_job and existing_job.get("status") == "COMPLETED":
            logger.info(f"Skipping completed job from Firestore", job_id=job_id)
            processed_jobs.add(job_id)
            return {"status": "skipped", "reason": "already_completed"}
        
        try:
            result = await process_generation_job(job, token)
            processed_jobs.add(job_id)
            return result
        except Exception as e:
            processed_jobs.add(job_id)  # Don't retry failed jobs either
            raise

    worker = Worker(
        "generation",  # Queue name - matches NestJS BullMQ queue
        process_job_wrapper,
        {
            "connection": {
                "host": redis_host,
                "port": redis_port,
            },
            "concurrency": 1,  # Process one at a time to avoid rate limits
            "autorun": True,
            "removeOnComplete": {"count": 0},  # Remove completed jobs
            "removeOnFail": {"count": 10},  # Keep last 10 failed for debugging
        },
    )

    logger.info(f"Worker started, listening on queue 'generation' at {redis_host}:{redis_port}")

    # Keep worker running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")
        await worker.close()


if __name__ == "__main__":
    asyncio.run(main())
