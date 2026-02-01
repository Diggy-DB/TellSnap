"""
Storage Service - Handles S3 uploads and URL generation.
"""

from dataclasses import dataclass
from pathlib import Path
import boto3
from botocore.config import Config
import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class UploadResult:
    """Result of upload operation."""
    video_url: str
    hls_url: str
    thumbnail_url: str


class StorageService:
    """Handles file storage operations with S3."""

    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.s3_bucket_videos
        self.cdn_url = settings.cdn_url

    def upload_segment(
        self,
        segment_id: str,
        scene_id: str,
        video_path: Path,
        hls_path: Path,
        thumbnail_path: Path,
    ) -> UploadResult:
        """
        Upload all segment assets to S3.
        
        Args:
            segment_id: Segment ID
            scene_id: Scene ID for path organization
            video_path: Path to source video
            hls_path: Path to HLS directory
            thumbnail_path: Path to thumbnail
            
        Returns:
            UploadResult with CDN URLs
        """
        base_path = f"scenes/{scene_id}/segments/{segment_id}"

        # Upload source video
        video_key = f"{base_path}/source.mp4"
        self._upload_file(video_path, video_key, "video/mp4")

        # Upload HLS files
        hls_base = f"{base_path}/hls"
        self._upload_directory(hls_path, hls_base)

        # Upload thumbnail
        thumb_key = f"{base_path}/thumbnail.jpg"
        self._upload_file(thumbnail_path, thumb_key, "image/jpeg")

        return UploadResult(
            video_url=f"{self.cdn_url}/{video_key}",
            hls_url=f"{self.cdn_url}/{hls_base}/master.m3u8",
            thumbnail_url=f"{self.cdn_url}/{thumb_key}",
        )

    def _upload_file(
        self,
        local_path: Path,
        s3_key: str,
        content_type: str,
    ) -> None:
        """Upload a single file to S3."""
        logger.debug("Uploading file", path=str(local_path), key=s3_key)

        self.s3.upload_file(
            str(local_path),
            self.bucket,
            s3_key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "max-age=31536000",  # 1 year for immutable content
            },
        )

    def _upload_directory(self, local_dir: Path, s3_prefix: str) -> None:
        """Upload all files in a directory to S3."""
        for file_path in local_dir.iterdir():
            if file_path.is_file():
                s3_key = f"{s3_prefix}/{file_path.name}"
                
                # Determine content type
                if file_path.suffix == ".m3u8":
                    content_type = "application/vnd.apple.mpegurl"
                elif file_path.suffix == ".ts":
                    content_type = "video/mp2t"
                else:
                    content_type = "application/octet-stream"

                self._upload_file(file_path, s3_key, content_type)

    def get_signed_url(self, key: str, expiration: int = 3600) -> str:
        """Generate a signed URL for private content."""
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expiration,
        )

    def upload_file(self, local_path: str | Path, s3_key: str) -> str:
        """
        Upload a file to S3 and return the CDN URL.
        
        Args:
            local_path: Path to local file
            s3_key: S3 key (path) for the file
            
        Returns:
            CDN URL for the uploaded file
        """
        local_path = Path(local_path)
        
        # Determine content type
        suffix = local_path.suffix.lower()
        content_types = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".m3u8": "application/vnd.apple.mpegurl",
            ".ts": "video/mp2t",
        }
        content_type = content_types.get(suffix, "application/octet-stream")
        
        logger.info("Uploading file", path=str(local_path), key=s3_key)
        
        self.s3.upload_file(
            str(local_path),
            self.bucket,
            s3_key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "max-age=31536000",
            },
        )
        
        return f"{self.cdn_url}/{s3_key}"

    def delete_segment(self, segment_id: str, scene_id: str) -> None:
        """Delete all files for a segment."""
        prefix = f"scenes/{scene_id}/segments/{segment_id}/"
        
        # List and delete all objects with prefix
        paginator = self.s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            if "Contents" in page:
                objects = [{"Key": obj["Key"]} for obj in page["Contents"]]
                self.s3.delete_objects(
                    Bucket=self.bucket,
                    Delete={"Objects": objects},
                )

    def download_file(self, s3_key: str, local_path: Path) -> bool:
        """
        Download a file from S3 to local path.
        
        Args:
            s3_key: S3 key (path) for the file
            local_path: Path where to save the file locally
            
        Returns:
            True if download succeeded, False otherwise
        """
        try:
            logger.info("Downloading file", key=s3_key, path=str(local_path))
            local_path.parent.mkdir(parents=True, exist_ok=True)
            self.s3.download_file(self.bucket, s3_key, str(local_path))
            return local_path.exists()
        except Exception as e:
            logger.warning("Failed to download file", key=s3_key, error=str(e))
            return False

    def get_segment_last_frame_path(self, segment_id: str) -> Path | None:
        """
        Download the last frame image for a segment if it exists.
        
        Returns:
            Path to downloaded last frame, or None if not found
        """
        import tempfile
        
        s3_key = f"segments/{segment_id}/lastframe.jpg"
        
        # Check if file exists
        try:
            self.s3.head_object(Bucket=self.bucket, Key=s3_key)
        except:
            return None
        
        # Download to temp file
        temp_dir = Path(tempfile.mkdtemp())
        local_path = temp_dir / f"lastframe_{segment_id}.jpg"
        
        if self.download_file(s3_key, local_path):
            return local_path
        return None

    def get_topic_reference_frames(self, topic_id: str, limit: int = 3) -> list[Path]:
        """
        Download reference frames from previous videos for a topic.
        These are used as style/character references for consistency.
        
        Args:
            topic_id: Topic ID to get frames for
            limit: Maximum number of reference frames to return
            
        Returns:
            List of paths to downloaded reference frames
        """
        import tempfile
        
        reference_frames = []
        temp_dir = Path(tempfile.mkdtemp())
        
        # List all reference frames for this topic
        prefix = f"topics/{topic_id}/references/"
        
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                MaxKeys=limit,
            )
            
            if "Contents" not in response:
                return []
            
            for obj in response["Contents"]:
                key = obj["Key"]
                filename = key.split("/")[-1]
                local_path = temp_dir / filename
                
                if self.download_file(key, local_path):
                    reference_frames.append(local_path)
                    
                if len(reference_frames) >= limit:
                    break
                    
        except Exception as e:
            logger.warning("Failed to get topic reference frames", topic_id=topic_id, error=str(e))
        
        return reference_frames

    def save_topic_reference_frame(self, topic_id: str, frame_path: Path, segment_id: str) -> str | None:
        """
        Save a reference frame for a topic (extracted from a segment's video).
        
        Args:
            topic_id: Topic ID
            frame_path: Path to the frame image
            segment_id: Segment ID (for unique naming)
            
        Returns:
            CDN URL of uploaded frame, or None if failed
        """
        try:
            s3_key = f"topics/{topic_id}/references/{segment_id}.jpg"
            url = self.upload_file(frame_path, s3_key)
            logger.info("Saved topic reference frame", topic_id=topic_id, segment_id=segment_id)
            return url
        except Exception as e:
            logger.warning("Failed to save topic reference frame", error=str(e))
            return None
