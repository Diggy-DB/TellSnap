# Imagify (formerly StoryForge)

> A collaborative AI-powered video story platform where users build narrative scenes together, generating AI-powered comic/video segments with character continuity.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-green.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)

---

## 🎬 What is Imagify?

Imagify is a web platform where users collaboratively build story scenes and generate AI-powered comic/video segments. Users can:

- **Browse Topics** - Explore curated story categories
- **Create Scenes** - Start new stories with custom prompts
- **Continue Stories** - Add segments to existing scenes
- **Maintain Continuity** - Scene Bible system keeps characters consistent
- **Watch & Share** - View completed story timelines

---

## ✨ Features

### Core Features
- **🔐 User Authentication** - JWT-based signup/login with secure sessions
- **🏠 Explore Stories** - Browse and discover scenes by topic
- **✏️ Scene Creation** - Create new collaborative stories
- **🎬 AI Image Generation** - Generate comic panels with Google AI (Imagen 3) or OpenAI
- **📖 Scene Bible** - Automatic character/setting continuity tracking
- **🔄 Continue & Fork** - Add segments or branch existing scenes
- **🔍 Search** - Find scenes by topic, title, or creator

### AI Pipeline
- **Script Expansion** - AI expands user prompts into detailed scripts
- **Script Segmentation** - Breaks scripts into panel-by-panel segments
- **Image Generation** - Creates comic panels via Google AI or OpenAI
- **Continuity Validation** - Ensures character consistency across segments

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, React Query, Zustand |
| **API Server** | NestJS 10, TypeScript, Passport JWT |
| **Database** | Google Cloud Firestore |
| **Cache/Queue** | Redis 7, BullMQ |
| **Storage** | Google Cloud Storage |
| **AI Generation** | Google AI (Imagen 3), OpenAI GPT-4 |
| **Worker** | Python 3.11, FastAPI, BullMQ |
| **Auth** | JWT + Passport |
| **Monorepo** | Turborepo, pnpm workspaces |

---

## 📁 Repository Structure

```
Hackathon/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       │   ├── page.tsx         # Home page
│   │       │   ├── explore/         # Browse scenes
│   │       │   ├── create/          # Create new scene
│   │       │   ├── scene/[id]/      # View/continue scene
│   │       │   └── login/           # Authentication
│   │       ├── components/     # React components
│   │       │   ├── Header.tsx
│   │       │   ├── Player.tsx
│   │       │   ├── SceneTimeline.tsx
│   │       │   ├── ContinueModal.tsx
│   │       │   └── GenreCards.tsx
│   │       ├── lib/            # Utilities & API client
│   │       │   ├── api.ts
│   │       │   └── auth-context.tsx
│   │       └── styles/         # Global styles
│   │
│   └── api/                    # NestJS API server
│       └── src/
│           ├── modules/
│           │   ├── auth/       # JWT authentication
│           │   ├── scenes/     # Scene CRUD
│           │   ├── segments/   # Video segments
│           │   ├── topics/     # Story categories
│           │   └── jobs/       # Background jobs
│           ├── firestore/      # Firestore integration
│           ├── redis/          # Redis caching
│           └── main.ts
│
├── services/
│   └── generator/              # Python AI generation worker
│       └── src/
│           ├── api.py          # FastAPI endpoints
│           ├── bullmq_worker.py # Job queue worker
│           ├── config.py       # Settings
│           └── services/
│               ├── comic_generator.py   # Image generation
│               ├── script_expander.py   # AI script expansion
│               ├── script_segmenter.py  # Panel segmentation
│               ├── continuity.py        # Scene Bible
│               ├── firestore_db.py      # Database
│               └── gcs_storage.py       # Cloud Storage
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       └── src/
│
├── docs/                       # Documentation
│   ├── 01-product-spec.md
│   ├── 02-architecture.md
│   ├── 03-database-schema.md
│   ├── 04-api-spec.md
│   ├── 05-continuity-system.md
│   └── ...
│
├── infra/
│   └── docker/                 # Docker configs
│
├── docker-compose.yml          # Local development
├── package.json                # Root (workspaces)
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- pnpm 8+
- Redis (local or Docker)
- Google Cloud Project (for Firestore + Storage)

### 1. Clone and Install

```bash
cd Hackathon
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
GCS_BUCKET="your-bucket-name"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_ACCESS_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# AI Providers (at least one required)
OPENAI_API_KEY="sk-..."
GOOGLE_AI_API_KEY="your-google-ai-key"
```

### 3. Start Redis (if not running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or use docker-compose
docker compose up -d redis
```

### 4. Run Development Servers

```bash
# Option 1: Run all with Turborepo
pnpm run dev

# Option 2: Run individually

# Terminal 1: Frontend (http://localhost:3000)
cd apps/web && pnpm run dev

# Terminal 2: API Server (http://localhost:3001)
cd apps/api && pnpm run dev

# Terminal 3: Generator Worker (http://localhost:8080)
cd services/generator
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.api:app --reload --port 8080
```

### 5. Access the Application

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:3000 |
| **API Server** | http://localhost:3001 |
| **Generator API** | http://localhost:8080 |

---

## 📚 API Endpoints

### Authentication
```
POST /api/v1/auth/signup     # Create account
POST /api/v1/auth/login      # Login, get JWT tokens
POST /api/v1/auth/refresh    # Refresh access token
GET  /api/v1/auth/me         # Get current user
```

### Topics
```
GET  /api/v1/topics          # List all topics
GET  /api/v1/topics/:id      # Get topic details
```

### Scenes
```
GET  /api/v1/scenes          # List scenes (with filters)
GET  /api/v1/scenes/:id      # Get scene with segments
POST /api/v1/scenes          # Create new scene (auth required)
```

### Segments
```
POST /api/v1/scenes/:id/segments  # Add segment to scene
GET  /api/v1/segments/:id         # Get segment details
```

### Jobs
```
GET  /api/v1/jobs/:id        # Get generation job status
```

---

## 🔄 Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI GENERATION PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User submits scene prompt                                   │
│                              │                                   │
│                              ▼                                   │
│  2. Script Expander (GPT-4)                                     │
│     • Expands prompt into detailed narrative                    │
│     • Maintains Scene Bible continuity                          │
│                              │                                   │
│                              ▼                                   │
│  3. Script Segmenter                                            │
│     • Breaks script into panel-by-panel segments                │
│     • Generates image prompts for each panel                    │
│                              │                                   │
│                              ▼                                   │
│  4. Comic Generator                                             │
│     • Google AI (Imagen 3) or OpenAI                           │
│     • Creates comic panel images                                │
│                              │                                   │
│                              ▼                                   │
│  5. Storage                                                     │
│     • Upload to Google Cloud Storage                            │
│     • Update Firestore with URLs                               │
│                              │                                   │
│                              ▼                                   │
│  6. Real-time Update                                            │
│     • Notify frontend via WebSocket/polling                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Development

### Run Tests

```bash
# Frontend/API tests
pnpm test

# Generator tests
cd services/generator
pytest tests/ -v
```

### Lint & Format

```bash
pnpm lint
pnpm format
```

### Database Operations

```bash
# Generate Prisma client (if using Prisma)
pnpm db:generate

# Run migrations
pnpm db:migrate
```

---

## 📖 Documentation

Detailed documentation is available in the `/docs` folder:

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

- JWT tokens stored in localStorage (access) and httpOnly cookies (refresh)
- All API endpoints requiring auth use Passport JWT guards
- Google Cloud credentials should never be committed
- Use environment variables for all secrets

---

## 👨‍💻 Author

**David**

---

## 📄 License

This project is licensed under the MIT License.
