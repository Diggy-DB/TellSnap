"""
Database Service - Handles database operations for the worker.

Uses PostgreSQL for data storage and Redis for pub/sub notifications.
"""

import json
from datetime import datetime
from typing import Optional
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class DatabaseService:
    """Database operations using PostgreSQL + Redis pub/sub."""

    def __init__(self):
        self.redis = redis.from_url(settings.redis_url)
        
        # Parse database URL for psycopg2
        db_url = settings.database_url
        if db_url.startswith("postgresql://"):
            db_url = db_url[len("postgresql://"):]
        
        # Parse credentials
        if "@" in db_url:
            creds, host_part = db_url.split("@")
            if ":" in creds:
                user, password = creds.split(":", 1)
            else:
                user, password = creds, ""
        else:
            user, password = "postgres", "postgres"
            host_part = db_url
        
        # Parse host and database
        if "/" in host_part:
            host_port, dbname = host_part.split("/", 1)
            if "?" in dbname:
                dbname = dbname.split("?")[0]
        else:
            host_port, dbname = host_part, "storyforge"
        
        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host, port = host_port, "5432"
        
        self.db_config = {
            "host": host,
            "port": int(port),
            "user": user,
            "password": password,
            "dbname": dbname,
        }
        logger.info("Database connected", host=host, port=port, dbname=dbname)

    def _get_conn(self):
        """Get a database connection."""
        return psycopg2.connect(**self.db_config, cursor_factory=RealDictCursor)

    def get_job(self, job_id: str) -> Optional[dict]:
        """Get job data from PostgreSQL."""
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, type, status, priority, segment_id, progress, stage, 
                               result, error, attempts, max_attempts, 
                               created_at, updated_at, started_at, completed_at
                        FROM jobs WHERE id = %s
                    """, (job_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        except Exception as e:
            logger.error("Failed to get job", job_id=job_id, error=str(e))
            return None

    def get_segment(self, segment_id: str) -> Optional[dict]:
        """Get segment data from PostgreSQL."""
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, scene_id, order_index, prompt, expanded_script, status,
                               video_url, hls_url, thumbnail_url, duration, continuity_hash,
                               created_by_id, created_at, updated_at, completed_at
                        FROM segments WHERE id = %s
                    """, (segment_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        except Exception as e:
            logger.error("Failed to get segment", segment_id=segment_id, error=str(e))
            return None

    def get_scene(self, scene_id: str) -> Optional[dict]:
        """Get scene data from PostgreSQL."""
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT s.id, s.title, s.description, s.status, s.topic_id,
                               t.title as topic_title
                        FROM scenes s
                        LEFT JOIN topics t ON s.topic_id = t.id
                        WHERE s.id = %s
                    """, (scene_id,))
                    row = cur.fetchone()
                    if row:
                        result = dict(row)
                        result["topic"] = {"title": result.pop("topic_title", "")}
                        return result
                    return None
        except Exception as e:
            logger.error("Failed to get scene", scene_id=scene_id, error=str(e))
            return None

    def get_scene_bible(self, scene_id: str) -> Optional[dict]:
        """Get Scene Bible for a scene from PostgreSQL."""
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, scene_id, characters, locations, objects, 
                               timeline, rules, version, created_at, updated_at
                        FROM scene_bibles WHERE scene_id = %s
                    """, (scene_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        except Exception as e:
            logger.error("Failed to get scene bible", scene_id=scene_id, error=str(e))
            return None

    def get_segments_before(self, scene_id: str, order_index: int) -> list[dict]:
        """Get all segments before a given order index for context."""
        try:
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, scene_id, order_index, prompt, expanded_script, 
                               status, video_url, image_url, thumbnail_url, duration, num_panels
                        FROM segments 
                        WHERE scene_id = %s AND order_index < %s
                        ORDER BY order_index ASC
                    """, (scene_id, order_index))
                    rows = cur.fetchall()
                    return [dict(row) for row in rows]
        except Exception as e:
            logger.error("Failed to get previous segments", scene_id=scene_id, error=str(e))
            return []

    def update_segment(self, segment_id: str, updates: dict) -> None:
        """Update segment data in PostgreSQL."""
        try:
            set_clauses = []
            values = []
            
            field_mapping = {
                "status": "status",
                "expanded_script": "expanded_script",
                "video_url": "video_url",
                "image_url": "image_url",
                "hls_url": "hls_url",
                "thumbnail_url": "thumbnail_url",
                "duration": "duration",
                "num_panels": "num_panels",
                "continuity_hash": "continuity_hash",
            }
            
            for key, value in updates.items():
                if key in field_mapping:
                    set_clauses.append(f"{field_mapping[key]} = %s")
                    values.append(value)
            
            if not set_clauses:
                return
            
            set_clauses.append("updated_at = %s")
            values.append(datetime.utcnow())
            values.append(segment_id)
            
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    query = f"UPDATE segments SET {', '.join(set_clauses)} WHERE id = %s"
                    cur.execute(query, values)
                conn.commit()

            self.redis.publish("segment:update", json.dumps({
                "segment_id": segment_id,
                "updates": updates,
                "timestamp": datetime.utcnow().isoformat(),
            }))
            logger.info("Updated segment", segment_id=segment_id)
        except Exception as e:
            logger.error("Failed to update segment", segment_id=segment_id, error=str(e))
            raise

    def update_job(self, job_id: str, updates: dict) -> None:
        """Update job data in PostgreSQL."""
        try:
            set_clauses = []
            values = []
            
            field_mapping = {
                "status": "status",
                "progress": "progress",
                "stage": "stage",
                "result": "result",
                "error": "error",
                "attempts": "attempts",
            }
            
            for key, value in updates.items():
                if key in field_mapping:
                    set_clauses.append(f"{field_mapping[key]} = %s")
                    values.append(value)
            
            if not set_clauses:
                return
            
            if updates.get("status") == "PROCESSING":
                set_clauses.append("started_at = %s")
                values.append(datetime.utcnow())
            elif updates.get("status") in ("COMPLETED", "FAILED"):
                set_clauses.append("completed_at = %s")
                values.append(datetime.utcnow())
            
            set_clauses.append("updated_at = %s")
            values.append(datetime.utcnow())
            values.append(job_id)
            
            with self._get_conn() as conn:
                with conn.cursor() as cur:
                    query = f"UPDATE jobs SET {', '.join(set_clauses)} WHERE id = %s"
                    cur.execute(query, values)
                conn.commit()

            self.redis.publish("job:update", json.dumps({
                "job_id": job_id,
                "updates": updates,
                "timestamp": datetime.utcnow().isoformat(),
            }))
            logger.info("Updated job", job_id=job_id)
        except Exception as e:
            logger.error("Failed to update job", job_id=job_id, error=str(e))
            raise

    def update_job_progress(self, job_id: str, progress: int, stage: str) -> None:
        """Update job progress."""
        self.update_job(job_id, {"progress": progress, "stage": stage})

    def complete_job(self, job_id: str, result: dict) -> None:
        """Mark job as completed."""
        self.update_job(job_id, {
            "status": "COMPLETED",
            "progress": 100,
            "result": json.dumps(result),
        })

    def fail_job(self, job_id: str, error: str) -> None:
        """Mark job as failed."""
        self.update_job(job_id, {
            "status": "FAILED",
            "error": error,
        })
