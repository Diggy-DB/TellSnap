# StoryForge Generator Service

Python-based video generation worker using Celery.

## Setup

```bash
cd services/generator
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Running

```bash
# Start worker
celery -A src.worker worker --loglevel=info

# Start with concurrency
celery -A src.worker worker --loglevel=info --concurrency=4
```

## Testing

```bash
pytest tests/ -v
```
