# 08 - Scalability & Performance

> Caching strategies, database partitioning, read replicas, and autoscaling.

---

## 1. Overview

StoryForge is designed to handle:
- **10K+ concurrent users**
- **1M+ scenes**
- **100M+ segments**
- **Petabytes of video storage**
- **10K+ API requests/second**

---

## 2. Caching Strategy

### 2.1 Cache Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CACHE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  LAYER 1: CDN Edge Cache                                       │ │
│  │  • Static assets (JS, CSS, images)                             │ │
│  │  • Video segments (.ts files)                                  │ │
│  │  • HLS playlists (.m3u8)                                       │ │
│  │  • Thumbnails                                                  │ │
│  │  TTL: 1 hour - 1 year (immutable for segments)                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  LAYER 2: API Response Cache (CDN or Varnish)                  │ │
│  │  • GET /topics (5 min)                                         │ │
│  │  • GET /scenes (1 min, vary by query)                          │ │
│  │  • GET /scenes/:id (30 sec)                                    │ │
│  │  TTL: 30 sec - 5 min                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  LAYER 3: Application Cache (Redis)                            │ │
│  │  • Hot scene data                                              │ │
│  │  • Scene Bible (frequently accessed)                           │ │
│  │  • Job status (polling target)                                 │ │
│  │  • User sessions                                               │ │
│  │  • Rate limit counters                                         │ │
│  │  TTL: 1 min - 1 hour                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  LAYER 4: Database Query Cache (PostgreSQL)                    │ │
│  │  • Prepared statement cache                                    │ │
│  │  • Connection pooling (PgBouncer)                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Redis Cache Keys

```typescript
// Cache key patterns and TTLs

const CACHE_CONFIG = {
  // Topics (rarely change)
  topics: {
    key: 'cache:topics',
    ttl: 300,  // 5 min
  },
  
  // Topic detail
  topic: {
    key: (id: string) => `cache:topic:${id}`,
    ttl: 300,
  },
  
  // Scene metadata
  scene: {
    key: (id: string) => `cache:scene:${id}`,
    ttl: 60,  // 1 min
  },
  
  // Scene Bible (hot data for continuations)
  sceneBible: {
    key: (id: string) => `cache:scene:${id}:bible`,
    ttl: 300,  // 5 min
  },
  
  // Job status (frequently polled)
  jobStatus: {
    key: (id: string) => `cache:job:${id}:status`,
    ttl: 60,
  },
  
  // User session
  session: {
    key: (id: string) => `session:${id}`,
    ttl: 86400,  // 24 hours
  },
  
  // Rate limiting
  rateLimit: {
    key: (type: string, id: string) => `ratelimit:${type}:${id}`,
    ttl: 60,  // 1 min window
  },
  
  // Scene playlist (for playback)
  playlist: {
    key: (id: string) => `cache:scene:${id}:playlist`,
    ttl: 30,  // 30 sec
  },
};
```

### 2.3 Cache Invalidation

```typescript
// Cache invalidation service
class CacheInvalidator {
  private redis: Redis;
  
  // Invalidate scene cache when segment added
  async onSegmentCreated(sceneId: string): Promise<void> {
    const keys = [
      `cache:scene:${sceneId}`,
      `cache:scene:${sceneId}:playlist`,
    ];
    
    await this.redis.del(...keys);
    
    // Publish invalidation event for distributed caches
    await this.redis.publish('cache:invalidate', JSON.stringify({
      type: 'scene',
      id: sceneId,
    }));
  }
  
  // Invalidate bible cache when updated
  async onBibleUpdated(sceneId: string): Promise<void> {
    await this.redis.del(`cache:scene:${sceneId}:bible`);
  }
  
  // Invalidate topics cache when topic added/modified
  async onTopicsChanged(): Promise<void> {
    // Get all topic-related keys
    const keys = await this.redis.keys('cache:topic*');
    await this.redis.del('cache:topics', ...keys);
  }
}
```

### 2.4 Cache-Aside Pattern

```typescript
// Generic cache-aside implementation
async function cacheAside<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from source
  const data = await fetchFn();
  
  // Store in cache (non-blocking)
  redis.setex(key, ttl, JSON.stringify(data)).catch(err => {
    logger.warn('Cache write failed', { key, error: err });
  });
  
  return data;
}

// Usage
async function getScene(id: string): Promise<Scene> {
  return cacheAside(
    `cache:scene:${id}`,
    60,
    () => db.scenes.findUnique({ where: { id } })
  );
}
```

---

## 3. Database Scaling

### 3.1 Read Replica Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE TOPOLOGY                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│     ┌───────────────────────────────────────────────────────────┐   │
│     │                    PRIMARY (Write)                         │   │
│     │                                                            │   │
│     │   • All write operations                                   │   │
│     │   • Critical read operations (consistency required)        │   │
│     │   • Transaction coordination                               │   │
│     │                                                            │   │
│     │   CPU: 8 cores, RAM: 32GB, Storage: 1TB NVMe               │   │
│     └───────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                    Streaming Replication                             │
│                              │                                       │
│          ┌───────────────────┼───────────────────┐                  │
│          │                   │                   │                  │
│          ▼                   ▼                   ▼                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │  REPLICA 1    │  │  REPLICA 2    │  │  REPLICA 3    │           │
│  │   (Browse)    │  │   (Search)    │  │  (Analytics)  │           │
│  │               │  │               │  │               │           │
│  │ • Topic lists │  │ • Full-text   │  │ • Reports     │           │
│  │ • Scene lists │  │   search      │  │ • Metrics     │           │
│  │ • Idea lists  │  │ • Filtering   │  │ • Dashboard   │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Read/Write Splitting

```typescript
// Prisma configuration with read replicas
// apps/api/src/database/prisma.service.ts

import { PrismaClient } from '@prisma/client';

// Primary client for writes
const primaryClient = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

// Replica client for reads
const replicaClient = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_REPLICA_URL }
  }
});

// Middleware to route reads to replica
const readReplicaMiddleware = async (params, next) => {
  const readOperations = [
    'findUnique',
    'findFirst',
    'findMany',
    'count',
    'aggregate',
    'groupBy',
  ];
  
  // Use replica for read operations (with eventual consistency)
  if (readOperations.includes(params.action)) {
    // Some reads require strong consistency
    if (params.args?.consistency === 'strong') {
      return next(params);  // Use primary
    }
    
    return replicaClient[params.model][params.action](params.args);
  }
  
  return next(params);
};

primaryClient.$use(readReplicaMiddleware);

export { primaryClient as db, replicaClient as dbReplica };
```

### 3.3 Partitioning Strategy

```sql
-- Segments table: Partition by month
CREATE TABLE segments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ... other fields
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions programmatically
-- Run monthly via cron job
CREATE OR REPLACE FUNCTION create_segments_partition(
    year INT,
    month INT
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := format('segments_%s_%s', year, LPAD(month::TEXT, 2, '0'));
    start_date := make_date(year, month, 1);
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF segments
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    -- Create indexes on partition
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (scene_id)',
        partition_name || '_scene_idx', partition_name
    );
    
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I (scene_id, sequence)',
        partition_name || '_scene_seq_idx', partition_name
    );
END;
$$ LANGUAGE plpgsql;

-- Jobs table: Same partitioning
CREATE TABLE jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ... other fields
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

### 3.4 Connection Pooling

```ini
# PgBouncer configuration
# infra/pgbouncer/pgbouncer.ini

[databases]
storyforge = host=primary.db.internal port=5432 dbname=storyforge
storyforge_replica = host=replica.db.internal port=5432 dbname=storyforge

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5

# Timeouts
server_connect_timeout = 5
server_idle_timeout = 600
server_lifetime = 3600
client_idle_timeout = 300

# Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60
```

---

## 4. Worker Autoscaling

### 4.1 Kubernetes HPA

```yaml
# infra/kubernetes/generator-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: generator-worker-hpa
  namespace: storyforge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: generator-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # Scale based on queue depth
    - type: External
      external:
        metric:
          name: redis_queue_depth
          selector:
            matchLabels:
              queue: generation
        target:
          type: AverageValue
          averageValue: "10"  # 10 jobs per worker
    
    # Also consider CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 120
```

### 4.2 Queue-Based Scaling

```python
# Custom autoscaler based on queue metrics
import redis
import kubernetes

class QueueAutoscaler:
    def __init__(self):
        self.redis = redis.Redis.from_url(REDIS_URL)
        self.k8s = kubernetes.client.AppsV1Api()
    
    def get_queue_depth(self) -> int:
        """Get total pending jobs."""
        # BullMQ queue depth
        waiting = self.redis.llen('bull:generation:wait')
        delayed = self.redis.zcard('bull:generation:delayed')
        return waiting + delayed
    
    def get_current_workers(self) -> int:
        """Get current worker count."""
        deployment = self.k8s.read_namespaced_deployment(
            name='generator-worker',
            namespace='storyforge'
        )
        return deployment.spec.replicas
    
    def calculate_desired_workers(self, queue_depth: int) -> int:
        """Calculate desired worker count."""
        jobs_per_worker = 5  # Target: each worker handles 5 jobs
        min_workers = 2
        max_workers = 20
        
        desired = max(min_workers, queue_depth // jobs_per_worker)
        return min(desired, max_workers)
    
    def scale(self):
        """Perform scaling decision."""
        queue_depth = self.get_queue_depth()
        current = self.get_current_workers()
        desired = self.calculate_desired_workers(queue_depth)
        
        if desired != current:
            logger.info(f"Scaling workers: {current} -> {desired} (queue: {queue_depth})")
            
            self.k8s.patch_namespaced_deployment_scale(
                name='generator-worker',
                namespace='storyforge',
                body={'spec': {'replicas': desired}}
            )
```

---

## 5. API Autoscaling

### 5.1 API Server HPA

```yaml
# infra/kubernetes/api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: storyforge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
    
    # Custom metric: requests per second
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"  # 100 RPS per pod
```

---

## 6. Search Scaling (OpenSearch)

### 6.1 OpenSearch Configuration

```yaml
# infra/opensearch/cluster.yaml
apiVersion: opensearch.opster.io/v1
kind: OpenSearchCluster
metadata:
  name: storyforge-search
spec:
  general:
    version: "2.11.0"
    httpPort: 9200
    vendor: opensearch
  
  nodePools:
    - component: masters
      replicas: 3
      diskSize: "50Gi"
      resources:
        requests:
          memory: "2Gi"
          cpu: "1000m"
      roles:
        - "cluster_manager"
    
    - component: data
      replicas: 5
      diskSize: "500Gi"
      resources:
        requests:
          memory: "8Gi"
          cpu: "2000m"
      roles:
        - "data"
        - "ingest"
    
    - component: coordinators
      replicas: 2
      resources:
        requests:
          memory: "2Gi"
          cpu: "1000m"
      roles:
        - "coordinating"
```

### 6.2 Index Design

```json
{
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "index.refresh_interval": "5s",
    "analysis": {
      "analyzer": {
        "story_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "story_analyzer",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "story_analyzer"
      },
      "topic_id": { "type": "keyword" },
      "category_id": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "creator_id": { "type": "keyword" },
      "segment_count": { "type": "integer" },
      "like_count": { "type": "integer" },
      "view_count": { "type": "integer" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}
```

---

## 7. Performance Optimization

### 7.1 Database Query Optimization

```sql
-- Optimized query for scene listing
EXPLAIN ANALYZE
SELECT 
    s.id,
    s.title,
    s.thumbnail_url,
    s.segment_count,
    s.like_count,
    s.created_at,
    t.name as topic_name,
    u.username as creator_username
FROM scenes s
JOIN topics t ON s.topic_id = t.id
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
  AND s.topic_id = $1
ORDER BY s.created_at DESC
LIMIT 20;

-- Covering index for this query
CREATE INDEX idx_scenes_topic_listing 
ON scenes (topic_id, created_at DESC)
INCLUDE (title, thumbnail_url, segment_count, like_count, user_id)
WHERE status = 'active';
```

### 7.2 N+1 Query Prevention

```typescript
// Bad: N+1 queries
const scenes = await db.scenes.findMany({ where: { topicId } });
for (const scene of scenes) {
  scene.creator = await db.users.findUnique({ where: { id: scene.userId } });
}

// Good: Eager loading
const scenes = await db.scenes.findMany({
  where: { topicId },
  include: {
    creator: {
      select: { id: true, username: true, avatarUrl: true }
    },
    topic: {
      select: { id: true, name: true }
    }
  }
});

// Even better: Data loader for GraphQL-style batching
const creatorLoader = new DataLoader(async (userIds: string[]) => {
  const users = await db.users.findMany({
    where: { id: { in: userIds } }
  });
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id));
});
```

### 7.3 Response Compression

```typescript
// NestJS compression middleware
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(compression({
    filter: (req, res) => {
      // Compress JSON responses
      if (req.headers['accept']?.includes('application/json')) {
        return true;
      }
      return compression.filter(req, res);
    },
    threshold: 1024,  // Only compress >1KB
    level: 6,  // Balanced compression level
  }));
}
```

---

## 8. Capacity Planning

### 8.1 Resource Estimates

| Component | MVP | V1 | V2 |
|-----------|-----|----|----|
| API Servers | 3x 2vCPU, 4GB | 5x 4vCPU, 8GB | 10x 4vCPU, 8GB |
| Workers | 5x 4vCPU, 8GB | 10x 4vCPU, 16GB | 20x 8vCPU, 32GB |
| PostgreSQL Primary | 4vCPU, 16GB, 500GB | 8vCPU, 32GB, 1TB | 16vCPU, 64GB, 2TB |
| PostgreSQL Replicas | 1x 4vCPU, 16GB | 2x 4vCPU, 16GB | 3x 8vCPU, 32GB |
| Redis | 2x 2vCPU, 8GB | 3x 4vCPU, 16GB | 6x 4vCPU, 32GB |
| OpenSearch | - | 3x 4vCPU, 16GB | 5x 8vCPU, 32GB |

### 8.2 Cost Projections (AWS)

| Scale | Monthly Est. |
|-------|--------------|
| MVP (10K users) | $2,000 - $3,000 |
| V1 (100K users) | $10,000 - $15,000 |
| V2 (1M users) | $50,000 - $100,000 |

*Excludes video generation API costs, which vary by provider*
