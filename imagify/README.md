# Imagify (formerly StoryForge)

> A collaborative AI comic platform: someone starts a story from a prompt, others continue it, and AI draws each new page.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-green.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)

---

## 🎬 What is Imagify?

Imagify is a web platform where users build comic stories together. Users can:

- **Browse Stories** - Explore comics by genre or topic
- **Create Scenes** - Start a new story from a prompt; long prompts are split into several pages
- **Continue Stories** - Add the next page to an existing story
- **Read Comics** - View each story's pages as a timeline

---

## ✨ Features

### Core Features

- **🔐 User Authentication** - Signup and login with JWT access and refresh tokens
- **🏠 Explore Stories** - Browse scenes and filter by topic or genre; sort by recent, popular, or trending
- **✏️ Scene Creation** - Create a scene from a prompt; the generator splits long prompts into multiple comic pages
- **➕ Continue Stories** - Logged-in users add new pages to any scene
- **🎨 AI Comic Pages** - Each page is expanded into panels, drawn by AI, and composed into a single image
- **📖 Scene Bible** - Every scene has a Scene Bible (characters, locations, rules) that is passed to script expansion. It starts empty; filling it in automatically is a planned feature.

### AI Pipeline

1. **Script Analysis** - The generator API decides whether a prompt needs several pages and splits it
2. **Script Expansion** - An OpenAI chat model turns each page prompt into panel descriptions, using earlier pages and the Scene Bible for continuity (without an OpenAI key, a simple fallback script is used)
3. **Panel Images** - Generated with Nano Banana Pro (apifree.ai), DALL-E 3 (OpenAI), or Imagen 3 (Google), trying them in that order
4. **Page Composition** - Panels are laid out into one comic page with Pillow, uploaded to Google Cloud Storage, and saved to Firestore

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| **API Server** | NestJS 10, TypeScript, Passport JWT, Swagger |
| **Database** | Google Cloud Firestore |
| **Queue** | Redis 7, BullMQ |
| **Storage** | Google Cloud Storage |
| **Worker** | Python 3.11+, BullMQ (Python), FastAPI, Pillow |
| **AI** | OpenAI (script expansion, DALL-E 3), Nano Banana Pro via apifree.ai, Google Imagen 3 |
| **Monorepo** | pnpm workspaces, Turborepo |

---

## 📁 Repository Structure

```
imagify/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # Pages (App Router): home, explore, genres, create,
│   │   │                       #   scene/[id], login, signup, profile, settings, ...
│   │   └── src/
│   │       ├── components/     # Header, SceneTimeline, RecentComics, ...
│   │       └── lib/            # API client and auth context
│   │
│   └── api/                    # NestJS API server
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/       # Signup, login, JWT
│       │   │   ├── topics/     # Story topics and categories
│       │   │   ├── scenes/     # Scenes and Scene Bible
│       │   │   ├── segments/   # Comic pages
│       │   │   └── jobs/       # Generation jobs
│       │   ├── firestore/      # Firestore access
│       │   ├── redis/          # Redis cache
│       │   └── main.ts
│       └── test/               # End-to-end tests
│
├── services/
│   └── generator/              # Python AI generation service
│       ├── src/
│       │   ├── api.py          # FastAPI: script analysis
│       │   ├── bullmq_worker.py # Worker: comic generation jobs
│       │   ├── config.py       # Settings
│       │   └── services/       # Script expansion, panel images, Firestore, Cloud Storage
│       └── tests/
│
├── packages/
│   └── shared/                 # Shared TypeScript types and utilities
│
├── docs/                       # Original design documents (see below)
├── docker-compose.yml          # Redis for local development
└── .env.example                # Configuration template
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm 8+
- Python 3.11+
- Redis (local or Docker)
- A Google Cloud project with Firestore and Cloud Storage enabled, and a service account key with access to both

### 1. Install

```bash
cd imagify
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
```

Fill in `.env`. Both the API and the generator read it. You need:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (long random strings; the API won't start without them)
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, and `GCS_BUCKET`
- At least one image provider key: `APIFREE_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_AI_API_KEY`

### 3. Start Redis

```bash
docker compose up -d redis
# or: docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Run

```bash
# Terminal 1: web app (port 3000) and API (port 4000)
pnpm run dev

# Terminals 2 and 3: the generator
cd services/generator
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m src.bullmq_worker                    # worker: draws the comic pages
uvicorn src.api:app --reload --port 8080       # API: script analysis (in another terminal)
```

### 5. Open

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:3000 |
| **API** | http://localhost:4000/api/v1 |
| **API Docs (Swagger)** | http://localhost:4000/api/docs |
| **Generator API** | http://localhost:8080 |

---

## 📚 API Endpoints

All routes start with `/api/v1`. 🔒 = login required.

### Authentication
```
POST /auth/signup             # Create account
POST /auth/login              # Log in, get access and refresh tokens
POST /auth/refresh            # Refresh the access token
POST /auth/logout             # 🔒 Log out
GET  /auth/me                 # 🔒 Current user
POST /auth/forgot-password    # Request a password reset
POST /auth/reset-password     # Set a new password with a reset token
```

### Topics
```
GET  /topics                  # List topics
GET  /topics/categories       # List categories
GET  /topics/:id              # Topic details
POST /topics                  # 🔒 Create a topic
```

### Scenes
```
GET  /scenes                  # List scenes (topicId, genre, sort, page, limit)
GET  /scenes/:id              # Scene with its pages
GET  /scenes/:id/pages        # Comic pages
GET  /scenes/:id/bible        # Scene Bible
POST /scenes                  # 🔒 Create a scene and queue its first pages
POST /scenes/:id/continue     # 🔒 Add a page to a scene
```

### Segments (comic pages)
```
GET  /segments/:id                     # Page details
GET  /segments/scene/:sceneId          # Pages in a scene
POST /segments/submit                  # 🔒 Submit a page prompt
POST /segments/generate                # 🔒 Generate a submitted page
POST /segments/submit-and-generate     # 🔒 Both in one step
GET  /segments/job/:jobId/status       # Generation status
```

### Jobs
```
GET  /jobs/:id                # Job status
POST /jobs/:id/retry          # 🔒 Retry a failed job
POST /jobs/:id/cancel         # 🔒 Cancel a pending job
```

---

## 🛠️ Development

### Run Tests

```bash
# API end-to-end tests (in-memory Firestore and Redis, so no cloud setup needed)
pnpm test

# Generator tests
cd services/generator
pytest
```

### Format

```bash
pnpm format
```

---

## 📖 Documentation

The `/docs` folder holds the design documents written at the start of the hackathon, when Imagify (then StoryForge) was planned as a video platform on PostgreSQL and S3. The code has since moved to comic pages on Firestore and Cloud Storage, so the docs describe the original plan rather than the current implementation.

- [Product Spec](docs/01-product-spec.md)
- [Architecture](docs/02-architecture.md)
- [Database Schema](docs/03-database-schema.md)
- [API Specification](docs/04-api-spec.md)
- [Continuity System](docs/05-continuity-system.md)
- [Async Pipeline](docs/06-async-pipeline.md)
- [Storage](docs/07-video-storage.md)
- [Scalability](docs/08-scalability.md)
- [Security](docs/09-security.md)

---

## 🔐 Security Notes

- Access and refresh tokens are stored in the browser's localStorage
- Routes that create content or start AI generation require a valid JWT
- The API refuses to start without `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- Password reset emails are not sent yet; the reset link is only logged when `NODE_ENV=development`
- `.env` files and service account keys are gitignored; never commit them

---

## 🧭 Known Limitations

- The Scene Bible is created for each scene but not filled in automatically yet
- Password reset emails are not implemented
- The web app checks job progress by polling; the API's Socket.io gateway is not connected to the worker's updates
- No linter is configured

---

## 👨‍💻 Author

**David**
