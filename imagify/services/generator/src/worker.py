from celery import Celery
from src.config import get_settings

settings = get_settings()

# Create Celery app
app = Celery(
    "storyforge-generator",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["src.tasks.generation"],
)

# Configure Celery
app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,
    worker_concurrency=settings.worker_concurrency,
    
    # Result backend
    result_expires=3600,  # 1 hour
    
    # Rate limiting
    task_annotations={
        "src.tasks.generation.generate_segment": {
            "rate_limit": "10/m",
        },
    },
    
    # Routing
    task_routes={
        "src.tasks.generation.*": {"queue": "generation"},
    },
)

if __name__ == "__main__":
    app.start()
