# 03 - Database Schema

> Complete PostgreSQL schema with tables, indexes, constraints, and partitioning strategy.

---

## 1. Entity Relationship Diagram (Text)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   topics    │       │ categories  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │◀──────│ topic_id    │
│ email       │       │ name        │       │ id (PK)     │
│ password    │       │ slug        │       │ name        │
│ username    │       │ is_curated  │       │ slug        │
└──────┬──────┘       └──────┬──────┘       └─────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │             │
       ▼              ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ user_topics │ │   ideas     │ │   scenes    │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ user_id(FK) │ │ id (PK)     │ │ id (PK)     │
│ topic_id    │ │ topic_id(FK)│ │ idea_id(FK) │
│ status      │ │ user_id(FK) │ │ user_id(FK) │
└─────────────┘ │ title       │ │ title       │
                │ prompt      │ │ status      │
                └─────────────┘ └──────┬──────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       │                               │                               │
       ▼                               ▼                               ▼
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│scene_bibles │               │  segments   │               │scene_summ.  │
├─────────────┤               ├─────────────┤               ├─────────────┤
│ scene_id(FK)│               │ id (PK)     │               │ scene_id(FK)│
│ version     │               │ scene_id(FK)│               │ summary     │
│ data (JSONB)│               │ user_id(FK) │               │ segments_   │
└─────────────┘               │ sequence    │               │ covered     │
                              │ video_url   │               └─────────────┘
                              │ job_id(FK)  │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │    jobs     │
                              ├─────────────┤
                              │ id (PK)     │
                              │ scene_id(FK)│
                              │ user_id(FK) │
                              │ status      │
                              │ stage       │
                              └─────────────┘
```

---

## 2. Complete Schema Definition

### 2.1 Users

```sql
-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),  -- null for OAuth users
    username        VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    bio             TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'user',  -- user, moderator, admin
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    
    CONSTRAINT users_role_check CHECK (role IN ('user', 'moderator', 'admin'))
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- OAuth accounts linked to users
CREATE TABLE oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,  -- google, github
    provider_id     VARCHAR(255) NOT NULL,
    access_token    TEXT,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_user_id ON oauth_accounts(user_id);
```

### 2.2 Topics & Categories

```sql
-- Admin-curated topics
CREATE TABLE topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    icon_url        VARCHAR(500),
    is_curated      BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    display_order   INTEGER NOT NULL DEFAULT 0,
    scene_count     INTEGER NOT NULL DEFAULT 0,  -- denormalized for perf
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_display_order ON topics(display_order);

-- User-submitted topics (require moderation)
CREATE TABLE user_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    promoted_to_topic_id UUID REFERENCES topics(id),  -- if approved and promoted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT user_topics_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_user_topics_status ON user_topics(status);
CREATE INDEX idx_user_topics_user_id ON user_topics(user_id);

-- Categories within topics
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(topic_id, slug)
);

CREATE INDEX idx_categories_topic_id ON categories(topic_id);
```

### 2.3 Ideas

```sql
-- User-submitted story ideas/prompts
CREATE TABLE ideas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    topic_id        UUID NOT NULL REFERENCES topics(id),
    category_id     UUID REFERENCES categories(id),
    
    title           VARCHAR(200) NOT NULL,
    prompt          TEXT NOT NULL,
    tags            TEXT[],  -- array of tags
    
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, hidden, removed
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
    
    scene_count     INTEGER NOT NULL DEFAULT 0,  -- denormalized
    like_count      INTEGER NOT NULL DEFAULT 0,  -- denormalized
    view_count      INTEGER NOT NULL DEFAULT 0,  -- denormalized
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT ideas_status_check 
        CHECK (status IN ('active', 'hidden', 'removed')),
    CONSTRAINT ideas_moderation_check 
        CHECK (moderation_status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_ideas_topic_id ON ideas(topic_id);
CREATE INDEX idx_ideas_category_id ON ideas(category_id);
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status) WHERE status = 'active';
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_like_count ON ideas(like_count DESC);
CREATE INDEX idx_ideas_tags ON ideas USING GIN(tags);
```

### 2.4 Scenes

```sql
-- Scenes (story threads)
CREATE TABLE scenes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id         UUID NOT NULL REFERENCES ideas(id),
    user_id         UUID NOT NULL REFERENCES users(id),  -- creator
    topic_id        UUID NOT NULL REFERENCES topics(id),
    
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, hidden, removed, locked
    
    segment_count   INTEGER NOT NULL DEFAULT 0,  -- denormalized
    total_duration  INTEGER NOT NULL DEFAULT 0,  -- seconds, denormalized
    contributor_count INTEGER NOT NULL DEFAULT 0,  -- denormalized
    
    view_count      INTEGER NOT NULL DEFAULT 0,
    like_count      INTEGER NOT NULL DEFAULT 0,
    
    thumbnail_url   VARCHAR(500),
    
    -- Bible versioning for optimistic locking
    bible_version   INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_segment_at TIMESTAMPTZ,
    
    CONSTRAINT scenes_status_check 
        CHECK (status IN ('active', 'hidden', 'removed', 'locked'))
);

CREATE INDEX idx_scenes_idea_id ON scenes(idea_id);
CREATE INDEX idx_scenes_user_id ON scenes(user_id);
CREATE INDEX idx_scenes_topic_id ON scenes(topic_id);
CREATE INDEX idx_scenes_status ON scenes(status) WHERE status = 'active';
CREATE INDEX idx_scenes_created_at ON scenes(created_at DESC);
CREATE INDEX idx_scenes_like_count ON scenes(like_count DESC);
CREATE INDEX idx_scenes_last_segment_at ON scenes(last_segment_at DESC);
```

### 2.5 Segments (Partitioned)

```sql
-- Segments table with partitioning by creation month
CREATE TABLE segments (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    scene_id        UUID NOT NULL,  -- FK enforced via trigger
    user_id         UUID NOT NULL,  -- contributor
    job_id          UUID NOT NULL,
    
    sequence        INTEGER NOT NULL,  -- order within scene
    
    -- Script data
    input_text      TEXT NOT NULL,      -- user's continuation text
    expanded_script TEXT NOT NULL,      -- AI-expanded script
    
    -- Video data
    video_url       VARCHAR(500) NOT NULL,
    hls_playlist_url VARCHAR(500),
    thumbnail_url   VARCHAR(500),
    
    duration        INTEGER NOT NULL,  -- seconds
    resolution      VARCHAR(20),       -- 720p, 1080p, etc.
    file_size       BIGINT,            -- bytes
    
    -- Bible snapshot at time of creation
    bible_version   INTEGER NOT NULL,
    
    -- Metadata
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (id, created_at),
    
    CONSTRAINT segments_status_check 
        CHECK (status IN ('active', 'hidden', 'removed'))
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (example for 2026)
CREATE TABLE segments_2026_01 PARTITION OF segments
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE segments_2026_02 PARTITION OF segments
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... create partitions for each month

-- Indexes on partitioned table
CREATE INDEX idx_segments_scene_id ON segments(scene_id);
CREATE INDEX idx_segments_user_id ON segments(user_id);
CREATE INDEX idx_segments_scene_sequence ON segments(scene_id, sequence);
CREATE INDEX idx_segments_created_at ON segments(created_at DESC);
```

### 2.6 Jobs (Partitioned)

```sql
-- Jobs table with partitioning by creation month
CREATE TABLE jobs (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    scene_id        UUID NOT NULL,
    user_id         UUID NOT NULL,
    
    -- Job type and status
    type            VARCHAR(50) NOT NULL DEFAULT 'continuation',
    status          VARCHAR(30) NOT NULL DEFAULT 'queued',
    stage           VARCHAR(30) NOT NULL DEFAULT 'pending',
    
    -- Progress tracking
    progress        INTEGER NOT NULL DEFAULT 0,  -- 0-100
    message         TEXT,
    
    -- Input data
    input_text      TEXT NOT NULL,
    bible_version   INTEGER NOT NULL,  -- version at job creation
    
    -- Processing context
    context_data    JSONB,  -- scene bible + recent segments
    
    -- Result data (populated on success)
    result_data     JSONB,  -- segment URLs, updated bible, etc.
    
    -- Error handling
    error_code      VARCHAR(50),
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    
    -- Timing
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    
    -- Idempotency
    idempotency_key VARCHAR(100) UNIQUE,
    
    PRIMARY KEY (id, created_at),
    
    CONSTRAINT jobs_status_check CHECK (
        status IN ('queued', 'processing', 'script_ready', 'continuity_checked',
                   'preview_ready', 'final_ready', 'failed', 'cancelled')
    ),
    CONSTRAINT jobs_stage_check CHECK (
        stage IN ('pending', 'script_expansion', 'continuity_validation',
                  'video_generation', 'upload', 'finalization', 'completed', 'error')
    )
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE jobs_2026_01 PARTITION OF jobs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE jobs_2026_02 PARTITION OF jobs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes
CREATE INDEX idx_jobs_scene_id ON jobs(scene_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status NOT IN ('final_ready', 'failed', 'cancelled');
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

### 2.7 Scene Bibles

```sql
-- Scene Bible (canonical continuity data)
CREATE TABLE scene_bibles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id        UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    
    -- Structured continuity data
    data            JSONB NOT NULL,
    
    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_segment_id UUID,  -- which segment triggered this version
    
    UNIQUE(scene_id, version)
);

CREATE INDEX idx_scene_bibles_scene_id ON scene_bibles(scene_id);
CREATE INDEX idx_scene_bibles_scene_version ON scene_bibles(scene_id, version DESC);

-- Scene summaries (long-history compression)
CREATE TABLE scene_summaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id        UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    
    summary         TEXT NOT NULL,
    segments_covered INTEGER[] NOT NULL,  -- sequence numbers covered
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scene_summaries_scene_id ON scene_summaries(scene_id);
```

### 2.8 Moderation

```sql
-- Moderation flags/reports
CREATE TABLE moderation_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What's being reported
    target_type     VARCHAR(20) NOT NULL,  -- idea, scene, segment, user
    target_id       UUID NOT NULL,
    
    -- Who reported
    reporter_id     UUID REFERENCES users(id),  -- null for auto-detection
    
    -- Report details
    reason          VARCHAR(50) NOT NULL,
    description     TEXT,
    
    -- Moderation status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Resolution
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    action_taken    VARCHAR(50),
    notes           TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT moderation_target_type_check 
        CHECK (target_type IN ('idea', 'scene', 'segment', 'user', 'topic')),
    CONSTRAINT moderation_status_check 
        CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed'))
);

CREATE INDEX idx_moderation_status ON moderation_flags(status) WHERE status = 'pending';
CREATE INDEX idx_moderation_target ON moderation_flags(target_type, target_id);
CREATE INDEX idx_moderation_created_at ON moderation_flags(created_at DESC);
```

### 2.9 Analytics (Optional)

```sql
-- View tracking
CREATE TABLE scene_views (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id        UUID NOT NULL,
    user_id         UUID,  -- null for anonymous
    ip_hash         VARCHAR(64),  -- hashed IP for anonymous tracking
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scene_views_scene_id ON scene_views(scene_id);
CREATE INDEX idx_scene_views_created_at ON scene_views(created_at);

-- Likes
CREATE TABLE likes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    target_type     VARCHAR(20) NOT NULL,  -- idea, scene
    target_id       UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);
```

---

## 3. Scene Bible JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "characters", "setting", "timeline"],
  "properties": {
    "version": {
      "type": "integer",
      "description": "Bible version number for optimistic locking"
    },
    "characters": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["entityId", "canonicalName"],
        "properties": {
          "entityId": {
            "type": "string",
            "pattern": "^char_[a-z0-9]+$",
            "description": "Stable entity ID (e.g., char_abc123)"
          },
          "canonicalName": {
            "type": "string",
            "description": "Official name used in story"
          },
          "aliases": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Alternative names/nicknames"
          },
          "description": {
            "type": "string",
            "description": "Physical/personality description"
          },
          "traits": {
            "type": "array",
            "items": { "type": "string" }
          },
          "relationships": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "targetEntityId": { "type": "string" },
                "relationshipType": { "type": "string" }
              }
            }
          },
          "referenceAssets": {
            "type": "object",
            "properties": {
              "portraitUrl": { "type": "string" },
              "voiceAnchorUrl": { "type": "string" },
              "styleFrameUrl": { "type": "string" }
            }
          },
          "introducedInSegment": { "type": "integer" },
          "isActive": { "type": "boolean", "default": true }
        }
      }
    },
    "setting": {
      "type": "object",
      "properties": {
        "primaryLocation": { "type": "string" },
        "timePeriod": { "type": "string" },
        "worldRules": {
          "type": "array",
          "items": { "type": "string" }
        },
        "locations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "description": { "type": "string" }
            }
          }
        }
      }
    },
    "timeline": {
      "type": "object",
      "properties": {
        "currentPoint": { "type": "string" },
        "majorEvents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "segmentNumber": { "type": "integer" },
              "event": { "type": "string" },
              "consequences": { "type": "string" }
            }
          }
        }
      }
    },
    "plotThreads": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "description": { "type": "string" },
          "status": { 
            "type": "string",
            "enum": ["active", "resolved", "abandoned"]
          }
        }
      }
    },
    "styleGuide": {
      "type": "object",
      "properties": {
        "tone": { "type": "string" },
        "genre": { "type": "string" },
        "visualStyle": { "type": "string" },
        "narrativeStyle": { "type": "string" }
      }
    }
  }
}
```

---

## 4. Partitioning Strategy

### 4.1 Segments Table
- **Strategy**: Range partition by `created_at` (monthly)
- **Rationale**: Segments are append-only, queries often filter by time
- **Retention**: Keep all partitions (no auto-drop)
- **Maintenance**: Create new partitions monthly via cron job

### 4.2 Jobs Table
- **Strategy**: Range partition by `created_at` (monthly)
- **Rationale**: Jobs are time-series data, old jobs rarely queried
- **Retention**: Archive partitions older than 6 months to cold storage
- **Maintenance**: Create new partitions, archive old ones

### 4.3 Partition Management Script

```sql
-- Function to create next month's partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    year INT,
    month INT
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || year || '_' || LPAD(month::TEXT, 2, '0');
    start_date := make_date(year, month, 1);
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Index Strategy Summary

| Table | Index | Purpose |
|-------|-------|---------|
| users | email | Unique lookup on login |
| users | username | Profile lookups |
| topics | slug | URL-friendly lookup |
| ideas | topic_id | Filter by topic |
| ideas | created_at DESC | Sort by newest |
| ideas | like_count DESC | Sort by popular |
| ideas | tags (GIN) | Tag filtering |
| scenes | topic_id | Filter by topic |
| scenes | last_segment_at DESC | Sort by recently active |
| segments | scene_id, sequence | Ordered playlist |
| jobs | status | Find pending jobs |
| scene_bibles | scene_id, version DESC | Latest bible lookup |
| moderation_flags | status | Pending moderation queue |

---

## 6. Read Replica Routing

```typescript
// Prisma middleware for read replica routing
const readReplicaMiddleware = async (params, next) => {
  const readOperations = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'];
  
  if (readOperations.includes(params.action)) {
    // Route to read replica
    return prismaReplica[params.model][params.action](params.args);
  }
  
  // Write operations go to primary
  return next(params);
};
```
