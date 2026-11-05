from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Redis (for job queue and pub/sub)
    redis_url: str = "redis://localhost:6379"

    # Google Cloud
    google_cloud_project: str = "gen-lang-client-0432066024"
    google_application_credentials: str = ""
    
    # Google Cloud Storage
    gcs_bucket: str = "storyforge-comics"

    # AI Providers
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"
    
    # Apifree.ai (nano-banana-pro - high quality image gen)
    apifree_api_key: str = ""
    apifree_base_url: str = "https://api.apifree.ai/v1"
    apifree_image_model: str = "google/nano-banana-pro"
    
    # Google AI (Imagen 3)
    google_ai_api_key: str = ""

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
