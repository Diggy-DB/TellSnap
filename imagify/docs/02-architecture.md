# 02 - System Architecture

> Complete system architecture for StoryForge with service design, data flow, and component responsibilities.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                              │
│  │   Browser   │  │  Mobile Web │  │   Future    │                              │
│  │  (Next.js)  │  │   (PWA)     │  │   Native    │                              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                              │
└─────────┼────────────────┼────────────────┼─────────────────────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EDGE / CDN LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  CloudFront / Cloudflare                                                 │    │
│  │  • Static assets (JS, CSS, images)                                       │    │
│  │  • HLS video segments (.ts files)                                        │    │
│  │  • Thumbnails                                                            │    │
│  │  • API response caching (read-heavy endpoints)                           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  ALB / nginx                                                             │    │
│  │  • SSL termination                                                       │    │
│  │  • Health checks                                                         │    │
│  │  • Request routing                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
┌──────────────────────┐        ┌──────────────────────┐
│     WEB APP          │        │     API SERVER       │
│   (Next.js SSR)      │        │     (NestJS)         │
│                      │        │                      │
│ • Server-side render │        │ • REST API           │
│ • Static generation  │        │ • WebSocket          │
│ • Client hydration   │        │ • Auth middleware    │
│ • API routes (BFF)   │        │ • Rate limiting      │
│                      │        │ • Request validation │
└──────────────────────┘        └──────────┬───────────┘
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │                                │                                │
          ▼                                ▼                                ▼
┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│   REDIS CACHE    │            │    POSTGRESQL    │            │   JOB QUEUE      │
│                  │            │                  │            │  (BullMQ/Redis)  │
│ • Session store  │            │ • Primary DB     │            │                  │
│ • Hot data cache │            │ • Read replicas  │            │ • Job dispatch   │
│ • Rate limit     │            │ • Partitioned    │            │ • Retry logic    │
│ • Pub/Sub        │            │   segments/jobs  │            │ • DLQ            │
└──────────────────┘            └──────────────────┘            └────────┬─────────┘
                                                                         │
                                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            WORKER POOL (Autoscaling)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  GENERATOR SERVICE (Python/Celery)                                       │    │
│  │                                                                          │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │    │
│  │  │ Script Agent   │  │  Continuity    │  │    Video       │             │    │
│  │  │                │  │  Validator     │  │  Generator     │             │    │
│  │  │ • Expand text  │  │                │  │                │             │    │
│  │  │ • Bible context│  │ • Check rules  │  │ • Gen video    │             │    │
│  │  │ • LLM calls    │  │ • Auto-correct │  │ • Upload S3    │             │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STORAGE LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  S3-COMPATIBLE OBJECT STORAGE                                            │    │
│  │                                                                          │    │
│  │  Buckets:                                                                │    │
│  │  • storyforge-videos    (HLS segments, master playlists)                 │    │
│  │  • storyforge-assets    (thumbnails, reference images, audio)            │    │
│  │  • storyforge-exports   (compiled MP4s on-demand)                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SEARCH (Optional V1)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  OpenSearch / Elasticsearch                                              │    │
│  │  • Ideas full-text search                                                │    │
│  │  • Scene discovery                                                       │    │
│  │  • Tag-based filtering                                                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Service Breakdown

### 2.1 Web Application (apps/web)

**Technology**: Next.js 14 with App Router, TypeScript, TailwindCSS

**Responsibilities**:
- Server-side rendering for SEO and fast initial load
- Client-side navigation and interactivity
- Authentication UI (login, signup, profile)
- Browse pages (topics, ideas, scenes)
- Scene player with HLS video
- Job status polling / WebSocket integration
- Moderation reporting UI

**Key Dependencies**:
- React Query for data fetching/caching
- NextAuth.js for authentication
- hls.js for video playback
- Zustand for client state

**Ports**: 3000 (dev), 80/443 (prod behind LB)

---

### 2.2 API Server (apps/api)

**Technology**: NestJS, TypeScript, Prisma ORM

**Responsibilities**:
- RESTful API for all CRUD operations
- Authentication/authorization middleware
- Request validation (class-validator + Zod)
- Rate limiting (per user, per IP)
- Job dispatch to queue
- WebSocket gateway for real-time updates
- Database access (PostgreSQL via Prisma)
- Cache management (Redis)

**Modules**:
```
src/modules/
├── auth/           # Login, signup, sessions, JWT
├── users/          # User profiles, preferences
├── topics/         # Admin topics, user topics
├── categories/     # Category CRUD
├── ideas/          # Idea submission, listing
├── scenes/         # Scene CRUD, continuation
├── segments/       # Segment metadata
├── jobs/           # Job status, retry
├── moderation/     # Reports, queue, actions
└── health/         # Liveness, readiness probes
```

**Ports**: 4000 (dev), 80/443 (prod behind LB)

---

### 2.3 Generator Service (services/generator)

**Technology**: Python 3.11, Celery, Redis

**Responsibilities**:
- Consume jobs from queue
- Stage A: Script expansion (LLM agent)
- Stage B: Continuity validation
- Stage C: Video generation (external API or local model)
- Stage D: Asset upload (S3)
- Stage E: Database updates (via API or direct)
- Progress reporting back to queue

**Components**:
```
src/
├── agents/
│   ├── script_agent.py      # LLM-based script expansion
│   └── prompts/             # Prompt templates
├── continuity/
│   ├── validator.py         # Rule-based + LLM validation
│   ├── scene_bible.py       # Bible CRUD operations
│   └── auto_corrector.py    # Minor issue fixes
├── video/
│   ├── generator.py         # Video generation orchestration
│   ├── hls_builder.py       # HLS manifest creation
│   └── thumbnail.py         # Thumbnail extraction
├── storage/
│   ├── s3_client.py         # S3 upload/download
│   └── paths.py             # Path conventions
└── worker.py                # Celery app entry point
```

**Scaling**: Horizontal scaling via Celery workers, autoscaled by queue depth

---

### 2.4 PostgreSQL Database

**Technology**: PostgreSQL 15

**Configuration**:
- Primary instance for writes
- Read replicas for read-heavy queries (browse, search)
- Connection pooling via PgBouncer
- Partitioning for segments and jobs tables

**Schema Highlights**:
- `users` - User accounts
- `topics`, `categories` - Taxonomy
- `ideas` - User prompts
- `scenes` - Story threads
- `segments` - Video segments (partitioned by scene creation date)
- `jobs` - Async jobs (partitioned by creation date)
- `scene_bibles` - Continuity data
- `scene_summaries` - Long-history compression
- `moderation_flags` - Content reports

---

### 2.5 Redis

**Technology**: Redis 7

**Usage**:
1. **Session Store**: User sessions (NextAuth adapter)
2. **Cache Layer**: Hot data (topic lists, scene metadata, job status)
3. **Rate Limiting**: Token bucket per user/IP
4. **Job Queue**: BullMQ for job dispatch
5. **Pub/Sub**: Real-time job updates to WebSocket gateway

**Key Patterns**:
```
cache:topics                     # List of all topics
cache:scene:{id}                 # Scene metadata
cache:scene:{id}:bible           # Scene Bible (hot)
cache:job:{id}:status            # Job status for polling
ratelimit:user:{userId}          # Rate limit counter
ratelimit:ip:{ip}                # IP-based rate limit
queue:jobs:generation            # BullMQ job queue
pubsub:job:{id}                  # Job progress updates
```

---

### 2.6 S3-Compatible Storage

**Technology**: AWS S3 / MinIO (local dev)

**Buckets**:

| Bucket | Contents | Access |
|--------|----------|--------|
| `storyforge-videos` | HLS segments (.ts), playlists (.m3u8) | CDN public |
| `storyforge-assets` | Thumbnails, reference images, audio | CDN public |
| `storyforge-exports` | Compiled MP4s (on-demand) | Signed URLs |
| `storyforge-internal` | Processing artifacts | Private |

**Path Conventions**:
```
videos/
  {sceneId}/
    {segmentId}/
      master.m3u8           # HLS master playlist
      720p.m3u8             # Variant playlist
      720p_0001.ts          # HLS segment
      720p_0002.ts
      ...
      thumbnail.jpg         # Segment thumbnail

assets/
  scenes/{sceneId}/
    reference/
      character_{entityId}.png
      style_frame.png
```

---

### 2.7 CDN Layer

**Technology**: CloudFront / Cloudflare

**Configuration**:
- Edge caching for static assets (24h TTL)
- Edge caching for HLS segments (7d TTL, immutable)
- API response caching (short TTL for browse endpoints)
- Origin shield to reduce S3 load
- Custom domain (cdn.storyforge.io)

---

## 3. Request Flow Diagrams

### 3.1 Scene Continuation Flow

```
┌──────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────────┐
│Client│    │   API   │    │  Redis  │    │  Queue  │    │  Worker   │
└──┬───┘    └────┬────┘    └────┬────┘    └────┬────┘    └─────┬─────┘
   │             │              │              │                │
   │ POST /scenes/{id}/continue │              │                │
   │─────────────▶              │              │                │
   │             │              │              │                │
   │             │ Check rate limit            │                │
   │             │──────────────▶              │                │
   │             │◀─────────────│              │                │
   │             │              │              │                │
   │             │ Validate request            │                │
   │             │ Check bible version         │                │
   │             │              │              │                │
   │             │ Create job record (DB)      │                │
   │             │              │              │                │
   │             │ Enqueue job                 │                │
   │             │────────────────────────────▶│                │
   │             │              │              │                │
   │   200 OK    │              │              │                │
   │   {jobId}   │              │              │                │
   │◀────────────│              │              │                │
   │             │              │              │ Dequeue job    │
   │             │              │              │────────────────▶
   │             │              │              │                │
   │             │              │              │  Script Agent  │
   │             │              │              │  (expand text) │
   │             │              │              │                │
   │             │              │       Update status           │
   │             │              │◀───────────────────────────────
   │             │              │              │                │
   │ Poll GET /jobs/{id}        │              │                │
   │─────────────▶              │              │                │
   │             │ Get from cache              │                │
   │             │──────────────▶              │                │
   │             │◀─────────────│              │                │
   │  {status: "script_ready"}  │              │                │
   │◀────────────│              │              │                │
   │             │              │              │  Validator     │
   │             │              │              │  (check bible) │
   │             │              │              │                │
   │             │              │              │  Video Gen     │
   │             │              │              │  (create video)│
   │             │              │              │                │
   │             │              │              │  Upload S3     │
   │             │              │              │                │
   │             │              │              │  Update Bible  │
   │             │              │              │                │
   │             │              │              │  Create Segment│
   │             │              │              │                │
   │             │              │       Update status: final_ready
   │             │              │◀───────────────────────────────
   │             │              │              │                │
   │ Poll GET /jobs/{id}        │              │                │
   │─────────────▶              │              │                │
   │  {status: "final_ready", segment: {...}}  │                │
   │◀────────────│              │              │                │
   │             │              │              │                │
```

### 3.2 Video Playback Flow

```
┌──────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│Client│    │   CDN   │    │   API   │    │   S3    │
└──┬───┘    └────┬────┘    └────┬────┘    └────┬────┘
   │             │              │              │
   │ GET /scenes/{id}/playlist  │              │
   │─────────────▶              │              │
   │             │ Cache miss   │              │
   │             │──────────────▶              │
   │             │              │ Generate playlist JSON
   │             │◀─────────────│              │
   │  {segments: [{url: ...}]}  │              │
   │◀────────────│              │              │
   │             │              │              │
   │ GET master.m3u8 (via CDN)  │              │
   │─────────────▶              │              │
   │             │ Cache hit or fetch from S3  │
   │             │────────────────────────────▶│
   │◀────────────│              │              │
   │             │              │              │
   │ GET 720p_0001.ts           │              │
   │─────────────▶              │              │
   │             │ Cache hit (edge)            │
   │◀────────────│              │              │
   │             │              │              │
   │ GET 720p_0002.ts           │              │
   │─────────────▶              │              │
   │◀────────────│              │              │
   │  ... (streaming continues) │              │
```

---

## 4. Component Interfaces

### 4.1 API → Queue Interface

```typescript
// Job payload dispatched to queue
interface GenerationJobPayload {
  jobId: string;
  sceneId: string;
  userId: string;
  continuationText: string;
  bibleVersion: number;
  createdAt: string;
  
  // Context for script agent
  context: {
    sceneBible: SceneBible;
    recentSegments: SegmentSummary[];  // Last 3-5
    longSummary: string;               // Compressed history
  };
  
  // Generation config
  config: {
    targetDuration: number;  // seconds
    stylePreset?: string;
    voicePreset?: string;
  };
}
```

### 4.2 Worker → API Callback Interface

```typescript
// Worker reports progress via Redis pub/sub or HTTP callback
interface JobProgressUpdate {
  jobId: string;
  status: JobStatus;
  progress: number;        // 0-100
  stage: JobStage;
  message?: string;
  error?: JobError;
  
  // Set when complete
  result?: {
    segmentId: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    updatedBibleVersion: number;
  };
}

type JobStatus = 
  | 'queued'
  | 'processing'
  | 'script_ready'
  | 'continuity_checked'
  | 'preview_ready'
  | 'final_ready'
  | 'failed';

type JobStage = 
  | 'script_expansion'
  | 'continuity_validation'
  | 'video_generation'
  | 'upload'
  | 'finalization';
```

### 4.3 Continuity Validator Interface

```python
# Python interface for continuity validation
class ContinuityValidator:
    def validate(
        self,
        expanded_script: str,
        scene_bible: SceneBible,
        recent_segments: list[SegmentSummary]
    ) -> ValidationResult:
        """
        Validate expanded script against Scene Bible.
        Returns issues or approval.
        """
        pass
    
    def auto_correct(
        self,
        script: str,
        issues: list[ContinuityIssue]
    ) -> tuple[str, list[ContinuityIssue]]:
        """
        Attempt to auto-correct minor issues.
        Returns corrected script and remaining issues.
        """
        pass

@dataclass
class ValidationResult:
    valid: bool
    issues: list[ContinuityIssue]
    corrected_script: str | None
    
@dataclass
class ContinuityIssue:
    type: Literal['name_drift', 'personality_contradiction', 
                  'timeline_error', 'setting_mismatch', 'new_character']
    severity: Literal['error', 'warning']
    description: str
    location: str  # Where in script
    suggestion: str | None
```

---

## 5. Technology Choices Rationale

| Choice | Rationale |
|--------|-----------|
| **Next.js** | SSR for SEO, excellent DX, React ecosystem |
| **NestJS** | Structured, TypeScript-native, good for large APIs |
| **Python/Celery** | Best ecosystem for ML/AI, proven job processing |
| **PostgreSQL** | ACID compliance, partitioning, rich querying |
| **Redis** | Fast cache, proven queue (BullMQ), pub/sub |
| **S3** | Industry standard, cheap at scale, CDN integration |
| **HLS** | Universal playback support, adaptive bitrate |

---

## 6. Deployment Topology

### MVP (Single Region)
```
┌─────────────────────────────────────────────────┐
│                 AWS us-east-1                    │
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ ECS/EC2 │  │ ECS/EC2 │  │ ECS/EC2 │         │
│  │  Web    │  │  API    │  │ Workers │         │
│  │  (2x)   │  │  (3x)   │  │  (5x)   │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│                                                  │
│  ┌─────────────────┐  ┌─────────────────┐       │
│  │  RDS Postgres   │  │  ElastiCache    │       │
│  │  (Primary +     │  │  (Redis Cluster)│       │
│  │   Read Replica) │  │                 │       │
│  └─────────────────┘  └─────────────────┘       │
│                                                  │
│  ┌─────────────────────────────────────┐        │
│  │            S3 Buckets               │        │
│  └─────────────────────────────────────┘        │
│                                                  │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│              CloudFront CDN                      │
│         (Global Edge Locations)                  │
└─────────────────────────────────────────────────┘
```

### V2 (Multi-Region)
- Active-active in 2 regions
- Global database replication
- S3 cross-region replication
- Route 53 latency-based routing
