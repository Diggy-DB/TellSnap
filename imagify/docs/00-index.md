# StoryForge Documentation Index

> Complete documentation for the StoryForge collaborative video story platform.

---

## 📚 Document Map

| # | Document | Description | Audience |
|---|----------|-------------|----------|
| 01 | [Product Spec](01-product-spec.md) | Requirements, user flows, acceptance criteria | PM, Dev, Design |
| 02 | [Architecture](02-architecture.md) | System design, services, data flow diagrams | Dev, DevOps, Arch |
| 03 | [Database Schema](03-database-schema.md) | PostgreSQL tables, indexes, constraints | Dev, DBA |
| 04 | [API Specification](04-api-spec.md) | REST endpoints, request/response examples | Dev, Frontend |
| 05 | [Continuity System](05-continuity-system.md) | Scene Bible, validator, memory strategy | Dev, AI/ML |
| 06 | [Async Pipeline](06-async-pipeline.md) | Job states, retries, idempotency | Dev, DevOps |
| 07 | [Video Storage](07-video-storage.md) | Segment strategy, HLS, CDN | Dev, DevOps |
| 08 | [Scalability](08-scalability.md) | Caching, partitioning, read replicas | Dev, DevOps |
| 09 | [Security](09-security.md) | Auth, rate limits, moderation | Dev, Security |
| 10 | [Risk Register](10-risk-register.md) | Problems and solutions | PM, Dev, Arch |
| 11 | [Roadmap](11-roadmap.md) | MVP → V1 → V2 phases | PM, Dev |

---

## 🏛️ Architecture Decision Records (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| [001](adr/001-monorepo-structure.md) | Monorepo Structure | Accepted |
| [002](adr/002-scene-bible-design.md) | Scene Bible Design | Accepted |
| [003](adr/003-video-segment-strategy.md) | Video Segment Strategy | Accepted |

---

## 🗂️ Document Contents Summary

### 01 - Product Spec
- Core concept and vision
- User personas
- User flows (signup → browse → create → watch)
- Functional requirements
- Non-functional requirements
- Acceptance criteria

### 02 - Architecture
- High-level system diagram
- Service breakdown (web, API, worker, storage)
- Request flow diagrams
- Component responsibilities
- Interface boundaries
- Technology choices rationale

### 03 - Database Schema
- Complete PostgreSQL schema
- Table definitions with constraints
- Index strategy
- Partitioning strategy for segments/jobs
- Entity relationship diagram (text)

### 04 - API Specification
- REST endpoint definitions
- Request/response JSON examples
- Error format standardization
- Authentication headers
- Rate limit headers

### 05 - Continuity System
- Scene Bible JSON schema
- Character entity ID system
- Continuity Validator rules
- Auto-correction logic
- Memory strategy (last N + summary + retrieval)
- Fork/rebase handling
- Bible versioning

### 06 - Async Pipeline
- Job state machine
- State transitions
- Idempotency rules
- Retry strategy
- Dead letter queue
- Progress reporting (polling + WebSocket)

### 07 - Video Storage
- Segment-based storage approach
- Storage path conventions
- HLS manifest generation
- Thumbnail generation
- CDN configuration
- On-demand compilation

### 08 - Scalability
- Caching strategy (Redis layers)
- Database partitioning
- Read replica routing
- Connection pooling
- CDN edge caching
- Worker autoscaling

### 09 - Security
- Authentication (JWT + sessions)
- Authorization (RBAC)
- Rate limiting strategy
- Abuse prevention
- Content moderation pipeline
- Audit logging

### 10 - Risk Register
- Problem → Solution matrix
- Mitigation strategies
- Monitoring alerts

### 11 - Roadmap
- MVP scope and timeline
- V1 features
- V2 features
- Success metrics per phase

---

## 🔍 Quick Reference

### Key Concepts

| Term | Definition |
|------|------------|
| **Topic** | Admin-curated category (e.g., "Sci-Fi", "Romance") |
| **Category** | Sub-classification within a topic |
| **Idea** | User-submitted story prompt |
| **Scene** | Collaborative story thread with multiple segments |
| **Segment** | Single video continuation within a scene |
| **Job** | Async processing unit (script → video) |
| **Scene Bible** | Canonical JSON with characters, settings, timeline |
| **Continuity Validator** | Gate that prevents character drift |

### Key APIs

| Action | Endpoint |
|--------|----------|
| Continue scene | `POST /api/v1/scenes/:id/continue` |
| Check job status | `GET /api/v1/jobs/:id` |
| Get scene playlist | `GET /api/v1/scenes/:id/playlist` |
| Get Scene Bible | `GET /api/v1/scenes/:id/bible` |

### Key Tables

| Table | Purpose |
|-------|---------|
| `scenes` | Story threads |
| `segments` | Video segments (partitioned) |
| `jobs` | Async job tracking (partitioned) |
| `scene_bibles` | Character/setting continuity |
| `scene_summaries` | Long-history compression |

---

## 📝 Contributing to Docs

1. Follow the numbered naming convention
2. Update this index when adding new docs
3. Use consistent heading structure
4. Include diagrams where helpful (text-based)
5. Keep code snippets minimal and illustrative
