# Imagify Generator Service

Python service that turns story prompts into comic pages. It has two parts:

- **BullMQ worker** (`src/bullmq_worker.py`): listens on the `generation` queue that the NestJS API writes to, expands each prompt into panel descriptions, generates the panel images, composes a page, uploads it to Google Cloud Storage, and updates the job and segment in Firestore.
- **FastAPI app** (`src/api.py`): `POST /api/analyze-script` splits a long prompt into comic pages for the API, and `GET /health` reports status.

## Setup

```bash
cd imagify/services/generator
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # then fill in your values
```

## Running

```bash
# Worker: processes comic generation jobs from Redis
python -m src.bullmq_worker

# API: script analysis on http://localhost:8080
uvicorn src.api:app --reload --port 8080
```

## AI providers

| Step | Provider | Required? |
|------|----------|-----------|
| Script expansion and page splitting | OpenAI chat model (`OPENAI_API_KEY`) | Optional. Without it, a simple fallback script is used. |
| Panel images | Nano Banana Pro via apifree.ai (`APIFREE_API_KEY`), then DALL-E 3 (`OPENAI_API_KEY`), then Imagen 3 (`GOOGLE_AI_API_KEY` or Vertex AI credentials) | At least one |

## Testing

```bash
pytest
```
