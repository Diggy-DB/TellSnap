"""
Google Cloud Storage Service - Handles file uploads to GCS.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import structlog
from google.cloud import storage
from google.oauth2 import service_account

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class UploadResult:
    """Result of upload operation."""
    image_url: str
    thumbnail_url: Optional[str] = None


class GCSStorageService:
    """Handles file storage operations with Google Cloud Storage."""

    def __init__(self):
        # Initialize GCS client
        if settings.google_application_credentials:
            credentials = service_account.Credentials.from_service_account_file(
                settings.google_application_credentials
            )
            self.client = storage.Client(
                project=settings.google_cloud_project,
                credentials=credentials
            )
        else:
            # Use default credentials (for Cloud Run, GCE, etc.)
            self.client = storage.Client(project=settings.google_cloud_project)
        
        self.bucket_name = settings.gcs_bucket
        self.bucket = self.client.bucket(self.bucket_name)
        
        logger.info("GCS Storage initialized", bucket=self.bucket_name)

    def upload_comic_page(
        self,
        segment_id: str,
        scene_id: str,
        image_path: Path,
        thumbnail_path: Optional[Path] = None,
    ) -> UploadResult:
        """
        Upload comic page image to GCS.
        
        Args:
            segment_id: Segment ID
            scene_id: Scene ID for path organization
            image_path: Path to comic page image
            thumbnail_path: Optional path to thumbnail
            
        Returns:
            UploadResult with public URLs
        """
        base_path = f"scenes/{scene_id}/segments/{segment_id}"

        # Upload main comic page image
        image_key = f"{base_path}/page.png"
        image_url = self._upload_file(image_path, image_key, "image/png")

        # Upload thumbnail if provided
        thumbnail_url = None
        if thumbnail_path and thumbnail_path.exists():
            thumb_key = f"{base_path}/thumbnail.jpg"
            thumbnail_url = self._upload_file(thumbnail_path, thumb_key, "image/jpeg")

        return UploadResult(
            image_url=image_url,
            thumbnail_url=thumbnail_url,
        )

    def upload_image(
        self,
        image_path: Path,
        destination_path: str,
        content_type: str = "image/png",
    ) -> str:
        """
        Upload a single image to GCS.
        
        Args:
            image_path: Local path to image
            destination_path: GCS object path
            content_type: MIME type
            
        Returns:
            Public URL of uploaded image
        """
        return self._upload_file(image_path, destination_path, content_type)

    def upload_bytes(
        self,
        data: bytes,
        destination_path: str,
        content_type: str = "image/png",
    ) -> str:
        """
        Upload bytes directly to GCS.
        
        Args:
            data: Image bytes
            destination_path: GCS object path
            content_type: MIME type
            
        Returns:
            Public URL of uploaded image
        """
        blob = self.bucket.blob(destination_path)
        blob.upload_from_string(data, content_type=content_type)
        
        # For uniform bucket-level access, we rely on bucket IAM for public access
        # Instead of blob.make_public() which uses legacy ACLs
        
        logger.debug("Uploaded bytes", path=destination_path, size=len(data))
        return self.get_public_url(destination_path)

    def _upload_file(
        self,
        local_path: Path,
        gcs_path: str,
        content_type: str,
    ) -> str:
        """Upload a single file to GCS and return public URL."""
        logger.debug("Uploading file", path=str(local_path), gcs_path=gcs_path)

        blob = self.bucket.blob(gcs_path)
        blob.upload_from_filename(
            str(local_path),
            content_type=content_type,
        )
        
        # Set cache control for immutable content
        blob.cache_control = "public, max-age=31536000"
        blob.patch()
        
        # For uniform bucket-level access, we rely on bucket IAM for public access
        # Instead of blob.make_public() which uses legacy ACLs
        
        return self.get_public_url(gcs_path)

    def delete_file(self, gcs_path: str) -> bool:
        """Delete a file from GCS."""
        try:
            blob = self.bucket.blob(gcs_path)
            blob.delete()
            logger.info("Deleted file", path=gcs_path)
            return True
        except Exception as e:
            logger.error("Failed to delete file", path=gcs_path, error=str(e))
            return False

    def get_public_url(self, gcs_path: str) -> str:
        """Get the public URL for a GCS object."""
        return f"https://storage.googleapis.com/{self.bucket_name}/{gcs_path}"

    def file_exists(self, gcs_path: str) -> bool:
        """Check if a file exists in GCS."""
        blob = self.bucket.blob(gcs_path)
        return blob.exists()
