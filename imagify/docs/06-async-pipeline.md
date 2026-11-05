# 06 - Async Pipeline

> Job states, queue architecture, retries, idempotency, and progress reporting.

---

## 1. Overview

The async pipeline handles all long-running generation tasks. No video generation happens synchronously—users receive a `jobId` immediately and poll (or subscribe via WebSocket) for updates.

### Design Principles
- **Instant Response**: API returns jobId in <500ms
- **Resilient Processing**: Jobs survive worker crashes
- **Idempotent Operations**: Retries don't create duplicates
- **Observable**: Progress visible at every stage
- **Recoverable**: Failed jobs can be retried

---

## 2. Job State Machine

```
                                    ┌──────────────────┐
                                    │                  │
                                    ▼                  │
┌─────────┐    ┌────────────┐    ┌─────────────────┐   │
│ QUEUED  │───▶│ PROCESSING │───▶│  SCRIPT_READY   │───┘ (retry loop)
└─────────┘    └────────────┘    └────────┬────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │ CONTINUITY_CHECKED  │
                               └────────┬────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │                           │
                          ▼                           ▼
              ┌─────────────────────┐     ┌─────────────────┐
              │   PREVIEW_READY     │     │     FAILED      │
              │  (low-res preview)  │     │                 │
              └────────┬────────────┘     └─────────────────┘
                       │                           ▲
                       ▼                           │
              ┌─────────────────────┐              │
              │    FINAL_READY      │──────────────┘
              │  (full quality)     │   (if finalization fails)
              └─────────────────────┘

Additional states:
┌─────────────┐
│  CANCELLED  │  (user cancelled)
└─────────────┘
```

### State Definitions

| State | Description | Next States |
|-------|-------------|-------------|
| `queued` | Job created, waiting in queue | `processing` |
| `processing` | Worker picked up job | `script_ready`, `failed` |
| `script_ready` | Script expansion complete | `continuity_checked`, `failed` |
| `continuity_checked` | Validation passed | `preview_ready`, `failed` |
| `preview_ready` | Low-res preview available | `final_ready`, `failed` |
| `final_ready` | Full quality video ready | Terminal |
| `failed` | Job failed (may retry) | `queued` (retry), Terminal |
| `cancelled` | User cancelled | Terminal |

---

## 3. Job Schema

```typescript
interface Job {
  id: string;                    // UUID
  sceneId: string;               // Target scene
  userId: string;                // Who created the job
  
  // Type
  type: 'scene_creation' | 'continuation';
  
  // Status
  status: JobStatus;
  stage: JobStage;
  progress: number;              // 0-100
  message: string | null;        // Human-readable status
  
  // Input
  inputText: string;             // User's continuation text
  bibleVersion: number;          // Bible version at job creation
  
  // Context (stored for retry)
  contextData: {
    sceneBible: SceneBible;
    recentSegments: SegmentSummary[];
    longSummary: string;
  };
  
  // Config
  config: {
    targetDuration: number;      // Target video length
    quality: 'preview' | 'standard' | 'high';
    styleOverrides?: StyleOverrides;
  };
  
  // Processing artifacts
  artifacts: {
    expandedScript: string | null;
    validationResult: ValidationResult | null;
    previewVideoUrl: string | null;
    finalVideoUrl: string | null;
    thumbnailUrl: string | null;
    hlsPlaylistUrl: string | null;
  };
  
  // Result (populated on success)
  result: {
    segmentId: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    updatedBibleVersion: number;
  } | null;
  
  // Error handling
  error: {
    code: string;
    message: string;
    details: any;
    stage: JobStage;
  } | null;
  
  // Retry tracking
  retryCount: number;
  maxRetries: number;
  lastRetryAt: string | null;
  
  // Idempotency
  idempotencyKey: string;        // Unique key to prevent duplicates
  
  // Timing
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  
  // Metadata
  workerInstanceId: string | null;  // Which worker processed it
}

type JobStatus = 
  | 'queued'
  | 'processing'
  | 'script_ready'
  | 'continuity_checked'
  | 'preview_ready'
  | 'final_ready'
  | 'failed'
  | 'cancelled';

type JobStage = 
  | 'pending'
  | 'script_expansion'
  | 'continuity_validation'
  | 'video_generation'
  | 'upload'
  | 'finalization'
  | 'completed'
  | 'error';
```

---

## 4. Queue Architecture

### 4.1 Queue Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         REDIS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ queue:generation │     │  queue:priority  │                  │
│  │    (standard)    │     │    (paid/VIP)    │                  │
│  └────────┬─────────┘     └────────┬─────────┘                  │
│           │                        │                             │
│           └────────────┬───────────┘                             │
│                        │                                         │
│                        ▼                                         │
│           ┌────────────────────────┐                             │
│           │  Dead Letter Queue     │                             │
│           │  (queue:dlq)           │                             │
│           └────────────────────────┘                             │
│                                                                  │
│  Pub/Sub Channels:                                               │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ pubsub:job:{id}  │  │ pubsub:scene:{id}│                     │
│  │ (job progress)   │  │ (scene updates)  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 BullMQ Configuration

```typescript
// Queue setup
import { Queue, Worker, QueueScheduler } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Main generation queue
const generationQueue = new Queue('generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,  // 5s, 10s, 20s
    },
    removeOnComplete: {
      count: 1000,  // Keep last 1000 completed
      age: 24 * 3600,  // Or 24 hours
    },
    removeOnFail: {
      count: 5000,  // Keep more failed for analysis
      age: 7 * 24 * 3600,  // 7 days
    },
  },
});

// Priority queue for paid users
const priorityQueue = new Queue('generation-priority', {
  connection,
  defaultJobOptions: {
    priority: 1,  // Higher priority
    attempts: 5,  // More retries
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

// Scheduler for delayed jobs
const scheduler = new QueueScheduler('generation', { connection });
```

### 4.3 Job Dispatch

```typescript
// API: Dispatch job to queue
async function dispatchGenerationJob(job: Job): Promise<void> {
  const queue = job.userId in premiumUsers 
    ? priorityQueue 
    : generationQueue;
  
  await queue.add(
    'generate-segment',
    {
      jobId: job.id,
      sceneId: job.sceneId,
      inputText: job.inputText,
      context: job.contextData,
      config: job.config,
    },
    {
      jobId: job.idempotencyKey,  // Prevents duplicate processing
      priority: calculatePriority(job),
    }
  );
}

function calculatePriority(job: Job): number {
  // Lower number = higher priority
  let priority = 100;
  
  // First segment of new scene = higher priority
  if (job.type === 'scene_creation') {
    priority -= 20;
  }
  
  // User's first job today = higher priority
  if (isFirstJobToday(job.userId)) {
    priority -= 10;
  }
  
  return priority;
}
```

---

## 5. Worker Implementation

### 5.1 Worker Setup (Python/Celery)

```python
# services/generator/src/worker.py

from celery import Celery
from celery.exceptions import MaxRetriesExceededError
import logging

app = Celery('generator')
app.config_from_object('src.config')

logger = logging.getLogger(__name__)


@app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(TransientError,),
    acks_late=True,  # Acknowledge after completion
)
def process_generation_job(self, job_data: dict):
    """Main generation task."""
    job_id = job_data['jobId']
    
    try:
        # Update status: processing
        update_job_status(job_id, 'processing', 'script_expansion', 0)
        
        # Stage 1: Script Expansion
        expanded_script = run_script_expansion(job_data)
        update_job_status(job_id, 'script_ready', 'continuity_validation', 25)
        save_artifact(job_id, 'expanded_script', expanded_script)
        
        # Stage 2: Continuity Validation
        validation_result = run_continuity_validation(
            expanded_script,
            job_data['context']['sceneBible']
        )
        
        if not validation_result.valid:
            if validation_result.auto_correctable:
                expanded_script = validation_result.corrected_script
            else:
                raise ContinuityError(validation_result.issues)
        
        update_job_status(job_id, 'continuity_checked', 'video_generation', 35)
        save_artifact(job_id, 'validation_result', validation_result)
        
        # Stage 3: Video Generation
        video_result = run_video_generation(
            expanded_script,
            job_data['context'],
            job_data['config'],
            progress_callback=lambda p: update_job_progress(job_id, 35 + p * 0.5)
        )
        
        update_job_status(job_id, 'preview_ready', 'upload', 85)
        
        # Stage 4: Upload to S3
        upload_result = upload_video_assets(
            job_data['sceneId'],
            video_result
        )
        
        update_job_status(job_id, 'preview_ready', 'finalization', 95)
        
        # Stage 5: Finalization
        segment = finalize_segment(
            job_id,
            job_data,
            expanded_script,
            upload_result
        )
        
        # Complete
        complete_job(job_id, segment)
        
    except ContinuityError as e:
        fail_job(job_id, 'CONTINUITY_VIOLATION', str(e), e.issues)
        
    except TransientError as e:
        # Will auto-retry
        logger.warning(f"Transient error for job {job_id}: {e}")
        raise
        
    except Exception as e:
        logger.exception(f"Job {job_id} failed")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        else:
            fail_job(job_id, 'GENERATION_FAILED', str(e))


def update_job_status(
    job_id: str,
    status: str,
    stage: str,
    progress: int,
    message: str = None
):
    """Update job status in database and notify via pub/sub."""
    # Update database
    db.jobs.update(
        where={'id': job_id},
        data={
            'status': status,
            'stage': stage,
            'progress': progress,
            'message': message or f"Processing: {stage}"
        }
    )
    
    # Update cache for fast polling
    cache.set(f'job:{job_id}:status', {
        'status': status,
        'stage': stage,
        'progress': progress,
        'message': message
    }, ttl=3600)
    
    # Publish to WebSocket subscribers
    redis.publish(f'pubsub:job:{job_id}', json.dumps({
        'type': 'job_progress',
        'jobId': job_id,
        'status': status,
        'stage': stage,
        'progress': progress,
        'message': message
    }))
```

### 5.2 Stage Implementations

```python
# Stage 1: Script Expansion
def run_script_expansion(job_data: dict) -> str:
    """Expand user's continuation into full script."""
    
    from src.agents.script_agent import ScriptAgent
    
    agent = ScriptAgent(llm_client)
    
    return agent.expand(
        continuation_text=job_data['inputText'],
        scene_bible=job_data['context']['sceneBible'],
        recent_segments=job_data['context']['recentSegments'],
        long_summary=job_data['context']['longSummary'],
        config=job_data['config']
    )


# Stage 2: Continuity Validation
def run_continuity_validation(
    script: str,
    bible: dict
) -> ValidationResult:
    """Validate script against Scene Bible."""
    
    from src.continuity.validator import ContinuityValidator
    
    validator = ContinuityValidator()
    result = validator.validate(script, bible)
    
    if not result.valid:
        # Try auto-correction
        corrected, remaining = validator.auto_correct(script, result.issues)
        
        if not remaining:
            return ValidationResult(
                valid=True,
                corrected_script=corrected,
                auto_correctable=True
            )
    
    return result


# Stage 3: Video Generation
def run_video_generation(
    script: str,
    context: dict,
    config: dict,
    progress_callback: Callable
) -> VideoResult:
    """Generate video from script."""
    
    from src.video.generator import VideoGenerator
    
    generator = VideoGenerator(
        api_client=video_api_client,
        config=config
    )
    
    # Build generation request with reference assets
    request = generator.build_request(
        script=script,
        bible=context['sceneBible'],
        style=context['sceneBible']['styleGuide']
    )
    
    # Generate with progress updates
    return generator.generate(request, progress_callback)


# Stage 4: Upload
def upload_video_assets(scene_id: str, video_result: VideoResult) -> UploadResult:
    """Upload video and generate HLS playlist."""
    
    from src.storage.s3_client import S3Client
    from src.video.hls_builder import HLSBuilder
    
    s3 = S3Client()
    hls = HLSBuilder()
    
    segment_id = generate_segment_id()
    base_path = f"videos/{scene_id}/{segment_id}"
    
    # Upload raw video
    video_url = s3.upload(
        f"{base_path}/source.mp4",
        video_result.video_bytes
    )
    
    # Generate and upload HLS segments
    hls_segments = hls.transcode_to_hls(video_result.video_bytes)
    hls_urls = {}
    
    for quality, segments in hls_segments.items():
        for i, segment in enumerate(segments):
            s3.upload(f"{base_path}/{quality}_{i:04d}.ts", segment)
        
        playlist = hls.generate_playlist(quality, len(segments))
        hls_urls[quality] = s3.upload(f"{base_path}/{quality}.m3u8", playlist)
    
    # Master playlist
    master_playlist = hls.generate_master_playlist(hls_urls)
    master_url = s3.upload(f"{base_path}/master.m3u8", master_playlist)
    
    # Thumbnail
    thumbnail = extract_thumbnail(video_result.video_bytes)
    thumbnail_url = s3.upload(f"{base_path}/thumbnail.jpg", thumbnail)
    
    return UploadResult(
        segment_id=segment_id,
        video_url=video_url,
        hls_url=master_url,
        thumbnail_url=thumbnail_url,
        duration=video_result.duration
    )


# Stage 5: Finalization
def finalize_segment(
    job_id: str,
    job_data: dict,
    script: str,
    upload_result: UploadResult
) -> Segment:
    """Create segment record and update scene."""
    
    with db.transaction():
        # Get next sequence number
        last_segment = db.segments.find_first(
            where={'scene_id': job_data['sceneId']},
            order_by={'sequence': 'desc'}
        )
        next_sequence = (last_segment.sequence + 1) if last_segment else 1
        
        # Create segment
        segment = db.segments.create({
            'id': upload_result.segment_id,
            'scene_id': job_data['sceneId'],
            'user_id': job_data['userId'],
            'job_id': job_id,
            'sequence': next_sequence,
            'input_text': job_data['inputText'],
            'expanded_script': script,
            'video_url': upload_result.video_url,
            'hls_playlist_url': upload_result.hls_url,
            'thumbnail_url': upload_result.thumbnail_url,
            'duration': upload_result.duration,
            'bible_version': job_data['bibleVersion']
        })
        
        # Update scene
        db.scenes.update(
            where={'id': job_data['sceneId']},
            data={
                'segment_count': {'increment': 1},
                'total_duration': {'increment': upload_result.duration},
                'last_segment_at': datetime.now(),
                'thumbnail_url': upload_result.thumbnail_url  # Use latest
            }
        )
        
        # Update bible
        update_scene_bible(job_data['sceneId'], script)
        
        return segment
```

---

## 6. Idempotency

### 6.1 Idempotency Key Generation

```typescript
function generateIdempotencyKey(
  userId: string,
  sceneId: string,
  inputText: string
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${sceneId}:${inputText}`)
    .digest('hex')
    .substring(0, 32);
  
  return `idem_${hash}`;
}
```

### 6.2 Duplicate Prevention

```typescript
async function createJob(params: CreateJobParams): Promise<Job> {
  const idempotencyKey = generateIdempotencyKey(
    params.userId,
    params.sceneId,
    params.inputText
  );
  
  // Check for existing job with same key
  const existing = await db.jobs.findUnique({
    where: { idempotency_key: idempotencyKey }
  });
  
  if (existing) {
    // Return existing job instead of creating duplicate
    return existing;
  }
  
  // Create new job
  return db.jobs.create({
    data: {
      ...params,
      idempotencyKey,
      status: 'queued'
    }
  });
}
```

### 6.3 Retry Safety

```python
# Worker: Ensure idempotent segment creation
def finalize_segment_idempotent(job_id: str, ...):
    """Idempotent finalization - safe to call multiple times."""
    
    # Check if segment already created for this job
    existing = db.segments.find_first(
        where={'job_id': job_id}
    )
    
    if existing:
        logger.info(f"Segment already exists for job {job_id}")
        return existing
    
    # Proceed with creation
    return create_segment(job_id, ...)
```

---

## 7. Dead Letter Queue

### 7.1 DLQ Configuration

```typescript
// Move to DLQ after all retries exhausted
generationQueue.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await dlq.add('failed-generation', {
      originalJob: job.data,
      error: err.message,
      stack: err.stack,
      attempts: job.attemptsMade,
      failedAt: new Date().toISOString(),
    });
    
    // Alert on-call
    await alerting.send({
      severity: 'warning',
      message: `Job ${job.data.jobId} moved to DLQ after ${job.attemptsMade} attempts`,
      error: err.message,
    });
  }
});
```

### 7.2 DLQ Processing

```typescript
// Manual DLQ processor (admin tool)
async function processDLQ(): Promise<void> {
  const failedJobs = await dlq.getJobs(['waiting', 'delayed']);
  
  for (const job of failedJobs) {
    const analysis = analyzeFailure(job.data);
    
    if (analysis.canRetry) {
      // Move back to main queue with fixes
      await generationQueue.add('generate-segment', {
        ...job.data.originalJob,
        fixApplied: analysis.fix,
      });
      
      await job.remove();
    } else {
      // Needs manual intervention
      await flagForManualReview(job.data);
    }
  }
}
```

---

## 8. Progress Reporting

### 8.1 Polling Endpoint

```typescript
// GET /jobs/:id - Optimized for polling
async function getJobStatus(jobId: string): Promise<JobStatus> {
  // Try cache first (updated by worker)
  const cached = await redis.get(`job:${jobId}:status`);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fall back to database
  const job = await db.jobs.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      stage: true,
      progress: true,
      message: true,
      error: true,
      result: true,
    }
  });
  
  // Cache for next poll
  await redis.setex(
    `job:${jobId}:status`,
    60,  // 1 minute TTL
    JSON.stringify(job)
  );
  
  return job;
}
```

### 8.2 WebSocket Updates

```typescript
// WebSocket gateway
@WebSocketGateway()
export class JobGateway {
  @WebSocketServer()
  server: Server;
  
  private subscriptions = new Map<string, Set<string>>();
  
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { jobId: string }) {
    const { jobId } = payload;
    
    if (!this.subscriptions.has(jobId)) {
      this.subscriptions.set(jobId, new Set());
      
      // Subscribe to Redis pub/sub
      this.redisSubscriber.subscribe(`pubsub:job:${jobId}`);
    }
    
    this.subscriptions.get(jobId).add(client.id);
    client.join(`job:${jobId}`);
  }
  
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { jobId: string }) {
    const { jobId } = payload;
    const subs = this.subscriptions.get(jobId);
    
    if (subs) {
      subs.delete(client.id);
      client.leave(`job:${jobId}`);
      
      if (subs.size === 0) {
        this.redisSubscriber.unsubscribe(`pubsub:job:${jobId}`);
        this.subscriptions.delete(jobId);
      }
    }
  }
  
  // Handle Redis pub/sub messages
  handleRedisMessage(channel: string, message: string) {
    const jobId = channel.replace('pubsub:job:', '');
    const data = JSON.parse(message);
    
    this.server.to(`job:${jobId}`).emit('job_update', data);
  }
}
```

### 8.3 Client-Side Polling

```typescript
// React hook for job status
function useJobStatus(jobId: string) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  
  useEffect(() => {
    if (!jobId) return;
    
    // Try WebSocket first
    const ws = new WebSocket(`wss://api.storyforge.io/ws`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', jobId }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'job_update') {
        setStatus(data);
        
        if (['final_ready', 'failed', 'cancelled'].includes(data.status)) {
          ws.close();
        }
      }
    };
    
    ws.onerror = () => {
      // Fall back to polling
      const interval = setInterval(async () => {
        const response = await fetch(`/api/v1/jobs/${jobId}`);
        const data = await response.json();
        setStatus(data.data);
        
        if (['final_ready', 'failed', 'cancelled'].includes(data.data.status)) {
          clearInterval(interval);
        }
      }, 2000);  // Poll every 2 seconds
      
      return () => clearInterval(interval);
    };
    
    return () => ws.close();
  }, [jobId]);
  
  return status;
}
```

---

## 9. Monitoring & Alerting

### 9.1 Key Metrics

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

# Job counters
jobs_created = Counter(
    'storyforge_jobs_created_total',
    'Total jobs created',
    ['type']  # scene_creation, continuation
)

jobs_completed = Counter(
    'storyforge_jobs_completed_total',
    'Total jobs completed',
    ['status']  # final_ready, failed, cancelled
)

jobs_retried = Counter(
    'storyforge_jobs_retried_total',
    'Total job retries',
    ['stage']  # Where the retry happened
)

# Timing
job_duration = Histogram(
    'storyforge_job_duration_seconds',
    'Job processing duration',
    ['stage'],
    buckets=[1, 5, 10, 30, 60, 120, 300, 600]
)

stage_duration = Histogram(
    'storyforge_stage_duration_seconds',
    'Individual stage duration',
    ['stage'],
    buckets=[1, 5, 10, 30, 60, 120]
)

# Queue health
queue_depth = Gauge(
    'storyforge_queue_depth',
    'Number of jobs in queue',
    ['queue']  # generation, priority
)

queue_age = Gauge(
    'storyforge_queue_oldest_job_age_seconds',
    'Age of oldest job in queue',
    ['queue']
)
```

### 9.2 Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: storyforge-jobs
    rules:
      - alert: JobQueueBacklog
        expr: storyforge_queue_depth{queue="generation"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Job queue backlog detected"
          description: "Queue has {{ $value }} pending jobs"
      
      - alert: JobQueueStuck
        expr: storyforge_queue_oldest_job_age_seconds > 600
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Jobs stuck in queue"
          description: "Oldest job is {{ $value }}s old"
      
      - alert: HighJobFailureRate
        expr: |
          rate(storyforge_jobs_completed_total{status="failed"}[5m]) 
          / rate(storyforge_jobs_completed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High job failure rate"
          description: "{{ $value | humanizePercentage }} of jobs failing"
      
      - alert: SlowVideoGeneration
        expr: |
          histogram_quantile(0.95, 
            rate(storyforge_stage_duration_seconds_bucket{stage="video_generation"}[5m])
          ) > 180
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow video generation"
          description: "P95 video generation time is {{ $value }}s"
```
