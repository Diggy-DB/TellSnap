# TellSnap 📸✨

> **Transform your memories into meaningful experiences through AI-powered storytelling and collaboration.**

TellSnap is a unified platform featuring two powerful applications that leverage artificial intelligence to help you create, share, and relive your stories.

Built by a team of three during a hackathon (January 31 – February 1, 2026). See [Team](#-team).

---

## 🌟 Projects Overview

| Project | Description | Tech Stack |
|---------|-------------|------------|
| **[Storify](#storify-)** | Transform photos into therapeutic meditation experiences | Vanilla JS, Firebase, OpenAI, ElevenLabs |
| **[Imagify](#imagify-)** | Collaborative AI-powered comic creation platform | Next.js, TypeScript, Python, PostgreSQL |

---

## Storify 📖

### What is Storify?

Storify is a **therapeutic memory journaling application** that transforms your cherished photos into calming, AI-narrated meditation experiences. Upload your memories, add personal notes, and let AI weave them into a soothing audio journey with gentle image transitions.

### ✨ Key Features

- **🔐 User Authentication** - Secure signup/login with Firebase Auth
- **📸 Photo Upload** - Upload and store memories in Firebase Cloud Storage
- **📝 Personal Notes** - Add context and stories to each photo
- **🧘 AI Meditation Generation** - GPT-4o with vision creates therapeutic narrations
- **🎙️ Text-to-Speech** - ElevenLabs' Rachel voice brings your stories to life
- **🖼️ Fullscreen Meditation Viewer** - Immersive experience with image transitions
- **🎨 Dynamic Themes** - 7 beautiful visual themes (Mountain, Beach, Sunset, Forest, Night, Winter, Desert)
- **💾 Cloud Sync** - All data synced with Firestore across devices
- **📋 Draft System** - Save incomplete stories as drafts

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         STORIFY APP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   index.html │    │   styles.css │    │    app.js    │       │
│  │  (UI/Layout) │    │  (Styling)   │    │ (Main Logic) │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │               firebase-config.js                       │       │
│  │  • Authentication (Email/Password)                     │       │
│  │  • Firestore (User data, Stories)                     │       │
│  │  • Cloud Storage (Image uploads)                       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                 api-config.js (gitignored)            │       │
│  │  • OpenAI API Key                                      │       │
│  │  • ElevenLabs API Key                                  │       │
│  │  • Firebase Configuration                              │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Firebase   │    │    OpenAI    │    │  ElevenLabs  │       │
│  │              │    │              │    │              │       │
│  │ • Auth       │    │ • GPT-4o     │    │ • TTS API    │       │
│  │ • Firestore  │    │ • Vision API │    │ • Rachel     │       │
│  │ • Storage    │    │              │    │   Voice      │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 🔄 How It Works

#### 1. User Authentication Flow
```
User → Login/Signup Form → Firebase Auth → Session Created → Redirect to App
```
- Users create accounts with username, email, and password
- Firebase Auth handles secure authentication
- User metadata stored in Firestore `/users/{uid}` collection

#### 2. Memory Upload Flow
```
Select Photo → Add Note → Save → Upload to Storage → Save to Firestore → Display in Timeline
```
- Photos are uploaded to Firebase Cloud Storage under `users/{uid}/images/`
- Metadata (notes, timestamps, URLs) saved to Firestore `/users/{uid}/stories`
- Images displayed as "moments" on an interactive story timeline

#### 3. Meditation Generation Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDITATION GENERATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Begin Meditation" button                        │
│                              │                                   │
│                              ▼                                   │
│  2. Collect all moments (photos + notes)                         │
│                              │                                   │
│                              ▼                                   │
│  3. Send to OpenAI GPT-4o with Vision                           │
│     ┌────────────────────────────────────────────┐              │
│     │ System Prompt: "You are a gentle,          │              │
│     │ therapeutic memory guide..."                │              │
│     │                                             │              │
│     │ User Content:                               │              │
│     │ - All notes from each moment               │              │
│     │ - Images (base64) for visual context       │              │
│     └────────────────────────────────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│  4. Receive unified meditation script                            │
│     (One flowing narrative connecting all moments)               │
│                              │                                   │
│                              ▼                                   │
│  5. Send script to ElevenLabs TTS API                           │
│     ┌────────────────────────────────────────────┐              │
│     │ Voice: Rachel (21m00Tcm4TlvDq8ikWAM)       │              │
│     │ Model: eleven_monolingual_v1               │              │
│     │ Stability: 0.5  |  Similarity: 0.75        │              │
│     └────────────────────────────────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│  6. Receive audio blob (MP3)                                     │
│                              │                                   │
│                              ▼                                   │
│  7. Open Fullscreen Meditation Viewer                            │
│     ┌────────────────────────────────────────────┐              │
│     │ • "Tap to Begin" overlay (autoplay policy) │              │
│     │ • User taps → Audio plays                  │              │
│     │ • Images transition based on timing        │              │
│     │ • Fullscreen immersive experience          │              │
│     └────────────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. Emotional Pattern Detection
The app includes a sophisticated local emotion detection system:

```javascript
emotionalPatterns = {
    joy:        ["happy", "smile", "celebrate", "amazing"...],
    sadness:    ["miss", "goodbye", "lost", "remember"...],
    love:       ["love", "together", "heart", "forever"...],
    adventure:  ["travel", "explore", "journey", "discover"...],
    family:     ["mom", "dad", "grandma", "reunion"...],
    friends:    ["friends", "crew", "squad", "hangout"...],
    achievement:["proud", "success", "graduation", "goal"...],
    peaceful:   ["calm", "serene", "sunset", "meditation"...],
    food:       ["delicious", "restaurant", "feast", "dinner"...]
}
```

When OpenAI is unavailable, the app generates contextually appropriate narrations based on detected keywords in user notes.

### 🚀 Running Storify

```bash
# Navigate to the Storify app
cd storify/storify

# Start local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

### ⚙️ Configuration

Create `api-config.js` in the `storify/storify/` folder (this file is gitignored):

```javascript
const API_CONFIG = {
    ELEVENLABS_API_KEY: 'your_elevenlabs_api_key',
    ELEVENLABS_VOICE_ID: '21m00Tcm4TlvDq8ikWAM',
    OPENAI_API_KEY: 'your_openai_api_key',
    FIREBASE_CONFIG: {
        apiKey: "your_firebase_api_key",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.firebasestorage.app",
        messagingSenderId: "your_messaging_id",
        appId: "your_app_id"
    }
};
```

---

## Imagify 🎨

### What is Imagify?

Imagify (formerly StoryForge) is a **collaborative AI-powered comic/video story platform** where users build narrative scenes together. Browse topics, create scenes, and generate AI-powered comic panels with consistent character continuity.

### ✨ Key Features

- **🔐 User Authentication** - JWT-based signup/login with secure sessions
- **🏠 Explore Stories** - Browse and discover scenes by topic
- **✏️ Scene Creation** - Start new collaborative stories with custom prompts
- **🎬 AI Image Generation** - Generate comic panels with Google AI (Imagen 3) or OpenAI
- **📖 Scene Bible System** - Automatic character/setting continuity tracking
- **🔄 Continue & Fork** - Add segments or branch existing scenes
- **🔍 Search** - Find scenes by topic, title, or creator

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        IMAGIFY PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                 FRONTEND (apps/web/)                  │       │
│  │  Next.js 14 + TypeScript + TailwindCSS               │       │
│  │                                                       │       │
│  │  Pages:                                               │       │
│  │  • / (Home) - Landing with features                  │       │
│  │  • /explore - Browse all scenes by topic             │       │
│  │  • /create - Create new scene form                   │       │
│  │  • /scene/[id] - View & continue a scene            │       │
│  │  • /login - User authentication                      │       │
│  │                                                       │       │
│  │  Components:                                          │       │
│  │  • Header - Navigation & user menu                   │       │
│  │  • SceneTimeline - Visual scene segments             │       │
│  │  • Player - Video segment playback                   │       │
│  │  • ContinueModal - Add new segments                  │       │
│  │  • GenreCards - Topic browsing                       │       │
│  └──────────────────────────────────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                  BACKEND (apps/api/)                  │       │
│  │  NestJS + TypeScript                                  │       │
│  │                                                       │       │
│  │  Modules:                                             │       │
│  │  • auth/ - JWT authentication & user management     │       │
│  │  • scenes/ - Scene CRUD operations                   │       │
│  │  • segments/ - Video segment management              │       │
│  │  • topics/ - Story topic/category taxonomy          │       │
│  │  • jobs/ - Async generation job queue               │       │
│  │                                                       │       │
│  │  Infrastructure:                                      │       │
│  │  • Google Cloud Firestore - Primary database        │       │
│  │  • Redis (ioredis) - Caching & sessions             │       │
│  │  • BullMQ - Background job processing               │       │
│  │  • Socket.io - Real-time updates                    │       │
│  └──────────────────────────────────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              GENERATOR SERVICE (services/generator/)  │       │
│  │  Python 3.11 + FastAPI + BullMQ                      │       │
│  │                                                       │       │
│  │  Services:                                            │       │
│  │  • comic_generator.py - Image generation             │       │
│  │  • script_expander.py - AI script expansion         │       │
│  │  • script_segmenter.py - Panel segmentation         │       │
│  │  • continuity.py - Scene Bible validation           │       │
│  │  • gcs_storage.py - Google Cloud Storage            │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 🔄 How It Works

#### 1. User Flow
```
Browse /explore → Select Topic → View Scenes → Create or Continue → AI Generation
```

#### 2. AI Generation Pipeline
```
User Prompt → Script Expander (GPT-4) → Script Segmenter → 
Comic Generator (Imagen 3/OpenAI) → Google Cloud Storage → Firestore
```

### 🚀 Running Imagify

```bash
# Navigate to the Imagify folder
cd imagify

# Install all dependencies (monorepo)
pnpm install

# Start all services in development mode
pnpm run dev

# Or run individually:

# Frontend (Next.js) - http://localhost:3000
cd apps/web && pnpm run dev

# Backend API (NestJS) - http://localhost:3001
cd apps/api && pnpm run dev

# Generator Worker (Python/FastAPI) - http://localhost:8080
cd services/generator
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn src.api:app --reload --port 8080
```

### ⚙️ Configuration

Create `.env` files in the respective directories:

**Root .env (or apps/api/.env):**
```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GCS_BUCKET=your-bucket-name

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI Providers
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=your-google-ai-key
```

**apps/web/.env.local:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## 📁 Project Structure

```
TellSnap/
├── index.html              # Landing page ("Welcome to TellSnap")
├── README.md               # This file
│
├── storify/                # Memory meditation app
│   ├── storify/
│   │   ├── index.html      # Main app HTML
│   │   ├── app.js          # Application logic (~3000 lines)
│   │   ├── styles.css      # Styling & themes
│   │   ├── firebase-config.js  # Firebase SDK setup & functions
│   │   ├── api-config.js   # API keys (gitignored)
│   │   └── api-config.example.js  # Template for api-config
│   ├── pics/               # Sample images
│   └── pics 2/             # Additional samples
│
└── imagify/                # Imagify collaborative platform
    ├── apps/
    │   ├── web/            # Next.js frontend
    │   │   └── src/
    │   │       ├── app/           # Next.js App Router pages
    │   │       ├── components/    # React components
    │   │       └── lib/           # Utilities & auth context
    │   │
    │   └── api/            # NestJS backend
    │       └── src/
    │           ├── modules/       # Feature modules
    │           ├── firestore/     # Firestore integration
    │           └── redis/         # Redis caching
    │
    ├── services/
    │   └── generator/      # Python AI generation worker
    │       └── src/
    │           └── services/      # Generation services
    │
    ├── packages/
    │   └── shared/         # Shared TypeScript types
    │
    ├── docs/               # Documentation
    ├── infra/              # Infrastructure config
    ├── docker-compose.yml  # Container orchestration
    └── turbo.json          # Turborepo config
```

---

## 🛠️ Technology Stack

### Storify
| Technology | Purpose |
|------------|---------|
| **Vanilla JavaScript** | Core application logic |
| **Firebase Auth** | User authentication |
| **Cloud Firestore** | NoSQL database for user data |
| **Firebase Storage** | Cloud image storage |
| **OpenAI GPT-4o** | AI narration with vision capabilities |
| **ElevenLabs** | High-quality text-to-speech |
| **Font Awesome** | Icons |
| **Google Fonts** | Typography (Playfair Display, Quicksand) |

### Imagify
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework (App Router) |
| **TypeScript** | Type safety across frontend & backend |
| **NestJS 10** | Backend API framework |
| **Google Cloud Firestore** | NoSQL database |
| **Google Cloud Storage** | Media/image storage |
| **Redis + BullMQ** | Caching & job queue |
| **Socket.io** | Real-time WebSocket updates |
| **Python 3.11 + FastAPI** | AI generation worker |
| **Google AI (Imagen 3)** | Comic panel generation |
| **OpenAI GPT-4** | Script expansion |
| **JWT + Passport** | Authentication |
| **TailwindCSS** | Styling |
| **pnpm + Turborepo** | Monorepo management |

---

## 🔐 Security Notes

- API keys are stored in `api-config.js` which is **gitignored**
- Firebase Security Rules should be configured for production
- Never commit sensitive credentials to version control
- Use environment variables in production deployments

---

## 🎯 Future Enhancements

### Storify
- [ ] Background music during meditation
- [ ] Multiple voice options
- [ ] Shareable meditation links
- [ ] Mobile app (React Native)
- [ ] Export meditation as video

### Imagify
- [ ] Advanced character customization
- [ ] Voice-over integration
- [ ] Export to social platforms
- [ ] AI style transfer
- [ ] Collaborative editing tools

---

## 👥 Team

- **Delger Byambasukh** ([@Diggy-DB](https://github.com/Diggy-DB)): project lead
- **Shafeen R Rahman** ([@puppyhacker-0](https://github.com/puppyhacker-0))
- **Fahad Akon** ([@md-fahad-akon](https://github.com/md-fahad-akon))

Storify's earlier commit history is in [puppyhacker-0/Storify](https://github.com/puppyhacker-0/Storify).

---

<p align="center">
  <b>TellSnap</b> - Where memories become meditations and stories come alive ✨
</p>
