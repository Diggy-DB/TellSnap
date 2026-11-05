"""
Firestore Database Service - Handles database operations using Google Firestore.
"""

import json
from datetime import datetime
from typing import Optional, Any
import redis
import structlog
from google.cloud import firestore
from google.oauth2 import service_account

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class FirestoreService:
    """Database operations using Google Firestore + Redis pub/sub."""

    def __init__(self):
        self.redis = redis.from_url(settings.redis_url)
        
        # Initialize Firestore client
        if settings.google_application_credentials:
            credentials = service_account.Credentials.from_service_account_file(
                settings.google_application_credentials
            )
            self.db = firestore.Client(
                project=settings.google_cloud_project,
                credentials=credentials
            )
        else:
            # Use default credentials (for Cloud Run, GCE, etc.)
            self.db = firestore.Client(project=settings.google_cloud_project)
        
        logger.info("Firestore connected", project=settings.google_cloud_project)

    # Collection references
    @property
    def topics(self):
        return self.db.collection("topics")
    
    @property
    def scenes(self):
        return self.db.collection("scenes")
    
    @property
    def segments(self):
        return self.db.collection("segments")
    
    @property
    def jobs(self):
        return self.db.collection("jobs")
    
    @property
    def users(self):
        return self.db.collection("users")
    
    @property
    def scene_bibles(self):
        return self.db.collection("scene_bibles")

    def _doc_to_dict(self, doc) -> Optional[dict]:
        """Convert Firestore document to dict with id."""
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    def get_job(self, job_id: str) -> Optional[dict]:
        """Get job data from Firestore."""
        try:
            doc = self.jobs.document(job_id).get()
            return self._doc_to_dict(doc)
        except Exception as e:
            logger.error("Failed to get job", job_id=job_id, error=str(e))
            return None

    def get_segment(self, segment_id: str) -> Optional[dict]:
        """Get segment data from Firestore."""
        try:
            doc = self.segments.document(segment_id).get()
            return self._doc_to_dict(doc)
        except Exception as e:
            logger.error("Failed to get segment", segment_id=segment_id, error=str(e))
            return None

    def get_scene(self, scene_id: str) -> Optional[dict]:
        """Get scene data from Firestore."""
        try:
            doc = self.scenes.document(scene_id).get()
            scene = self._doc_to_dict(doc)
            if scene and scene.get("topic_id"):
                # Fetch topic title
                topic_doc = self.topics.document(scene["topic_id"]).get()
                if topic_doc.exists:
                    scene["topic"] = {"title": topic_doc.to_dict().get("title", "")}
            return scene
        except Exception as e:
            logger.error("Failed to get scene", scene_id=scene_id, error=str(e))
            return None

    def get_scene_bible(self, scene_id: str) -> Optional[dict]:
        """Get Scene Bible for a scene from Firestore."""
        try:
            # Query scene_bibles where scene_id matches
            docs = self.scene_bibles.where("scene_id", "==", scene_id).limit(1).stream()
            for doc in docs:
                return self._doc_to_dict(doc)
            return None
        except Exception as e:
            logger.error("Failed to get scene bible", scene_id=scene_id, error=str(e))
            return None

    def get_segments_before(self, scene_id: str, order_index: int) -> list[dict]:
        """Get all segments before a given order index for context."""
        try:
            docs = (
                self.segments
                .where("scene_id", "==", scene_id)
                .where("order_index", "<", order_index)
                .order_by("order_index")
                .stream()
            )
            return [self._doc_to_dict(doc) for doc in docs]
        except Exception as e:
            logger.error("Failed to get previous segments", scene_id=scene_id, error=str(e))
            return []

    def update_segment(self, segment_id: str, updates: dict) -> None:
        """Update segment data in Firestore."""
        try:
            # Add updated_at timestamp
            updates["updated_at"] = datetime.utcnow()
            
            self.segments.document(segment_id).update(updates)

            # Publish update via Redis for real-time notifications
            self.redis.publish("segment:update", json.dumps({
                "segment_id": segment_id,
                "updates": {k: str(v) if isinstance(v, datetime) else v for k, v in updates.items()},
                "timestamp": datetime.utcnow().isoformat(),
            }))
            logger.info("Updated segment", segment_id=segment_id)
        except Exception as e:
            logger.error("Failed to update segment", segment_id=segment_id, error=str(e))
            raise

    def update_job(self, job_id: str, updates: dict) -> None:
        """Update job data in Firestore."""
        try:
            # Add timestamps
            updates["updated_at"] = datetime.utcnow()
            
            if updates.get("status") == "PROCESSING":
                updates["started_at"] = datetime.utcnow()
            elif updates.get("status") in ("COMPLETED", "FAILED"):
                updates["completed_at"] = datetime.utcnow()
            
            self.jobs.document(job_id).update(updates)

            # Publish update via Redis for real-time notifications
            self.redis.publish("job:update", json.dumps({
                "job_id": job_id,
                "updates": {k: str(v) if isinstance(v, datetime) else v for k, v in updates.items()},
                "timestamp": datetime.utcnow().isoformat(),
            }))
            logger.info("Updated job", job_id=job_id)
        except Exception as e:
            logger.error("Failed to update job", job_id=job_id, error=str(e))
            raise

    def update_job_progress(self, job_id: str, progress: int, stage: str) -> None:
        """Update job progress."""
        self.update_job(job_id, {"progress": progress, "stage": stage})

    def update_scene(self, scene_id: str, updates: dict) -> None:
        """Update scene data in Firestore."""
        try:
            # Add updated_at timestamp
            updates["updated_at"] = datetime.utcnow()
            
            self.scenes.document(scene_id).update(updates)

            # Publish update via Redis for real-time notifications
            self.redis.publish("scene:update", json.dumps({
                "scene_id": scene_id,
                "updates": {k: str(v) if isinstance(v, datetime) else v for k, v in updates.items()},
                "timestamp": datetime.utcnow().isoformat(),
            }))
            logger.info("Updated scene", scene_id=scene_id)
        except Exception as e:
            logger.error("Failed to update scene", scene_id=scene_id, error=str(e))
            raise

    def complete_job(self, job_id: str, result: dict) -> None:
        """Mark job as completed."""
        self.update_job(job_id, {
            "status": "COMPLETED",
            "progress": 100,
            "result": result,  # Firestore handles dicts natively
        })

    def fail_job(self, job_id: str, error: str) -> None:
        """Mark job as failed."""
        self.update_job(job_id, {
            "status": "FAILED",
            "error": error,
        })

    # Create operations for completeness
    def create_segment(self, data: dict) -> str:
        """Create a new segment in Firestore."""
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        doc_ref = self.segments.document()
        doc_ref.set(data)
        return doc_ref.id

    def create_job(self, data: dict) -> str:
        """Create a new job in Firestore."""
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        doc_ref = self.jobs.document()
        doc_ref.set(data)
        return doc_ref.id

    def create_scene(self, data: dict) -> str:
        """Create a new scene in Firestore."""
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        doc_ref = self.scenes.document()
        doc_ref.set(data)
        return doc_ref.id

    def create_topic(self, data: dict) -> str:
        """Create a new topic in Firestore."""
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        doc_ref = self.topics.document()
        doc_ref.set(data)
        return doc_ref.id
