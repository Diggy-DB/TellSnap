from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # PostgreSQL
    database_url: str = "postgresql://postgres:postgres@localhost:5432/storyforge"

    # S3
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_videos: str = "storyforge-videos"
    s3_bucket_internal: str = "storyforge-internal"
    s3_region: str = "us-east-1"

    # CDN
    cdn_url: str = "http://localhost:9000/storyforge-videos"

    # AI Providers
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"
    
    # Google AI Studio (Veo 3)
    google_ai_api_key: str = ""
    google_ai_model: str = "veo-3"
    google_ai_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    google_application_credentials: str = ""
    google_cloud_project: str = ""

    # Worker
    worker_concurrency: int = 4
    max_retries: int = 3
    retry_delay: int = 60
    
    # API Server
    api_port: int = 8080

    class Config:
        env_file = str(Path(__file__).parent.parent / ".env")
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
