# 10 - Risk Register

> Problem → Solution mapping for anticipated challenges.

---

## Overview

This document identifies key risks for the StoryForge platform and provides mitigation strategies. Each risk is rated by:

- **Probability**: Low / Medium / High
- **Impact**: Low / Medium / High / Critical
- **Priority**: Calculated as Probability × Impact

---

## 1. Infrastructure Risks

### 1.1 Queue Overload

| Attribute | Value |
|-----------|-------|
| **Problem** | Sudden spike in scene generation requests overwhelms the job queue, causing delays and potential message loss |
| **Probability** | High |
| **Impact** | High |
| **Priority** | P1 |

**Causes:**
- Viral content triggers mass continuation attempts
- Marketing campaign drives unexpected traffic
- Bot/abuse attack

**Solutions:**

1. **Queue Backpressure**
   ```typescript
   // Reject new jobs if queue is too deep
   const MAX_QUEUE_DEPTH = 10000;
   
   async function enqueueJob(job: Job): Promise<void> {
     const depth = await queue.count();
     if (depth > MAX_QUEUE_DEPTH) {
       throw new HttpException(
         'System is busy. Please try again in a few minutes.',
         503
       );
     }
     await queue.add(job);
   }
   ```

2. **Priority Queues**
   - Separate queues for paid vs. free users
   - Premium users get dedicated worker pool

3. **Auto-scaling**
   - Kubernetes HPA based on queue depth
   - Scale from 2 to 20 workers within 5 minutes

4. **Rate Limiting**
   - Per-user: 5 generations/hour
   - Global: 1000 concurrent jobs max

**Monitoring:**
- Alert when queue depth > 5000
- Alert when avg wait time > 5 minutes

---

### 1.2 Database Hotspots

| Attribute | Value |
|-----------|-------|
| **Problem** | Popular scenes create read/write contention on specific rows, degrading performance |
| **Probability** | Medium |
| **Impact** | High |
| **Priority** | P1 |

**Causes:**
- Viral scene with thousands of concurrent viewers
- Multiple users trying to continue the same scene
- Lock contention on Scene Bible updates

**Solutions:**

1. **Read Replicas**
   - Route all read traffic to replicas
   - 3 replicas for geographic distribution

2. **Aggressive Caching**
   ```typescript
   // Cache hot scene data in Redis
   const CACHE_TTL = {
     scene: 60,           // 1 minute
     sceneBible: 300,     // 5 minutes (immutable between updates)
     segments: 3600,      // 1 hour (append-only)
   };
   ```

3. **Optimistic Locking**
   ```sql
   UPDATE scene_bibles 
   SET data = $1, version = version + 1 
   WHERE scene_id = $2 AND version = $3;
   -- Retry on version mismatch
   ```

4. **Partitioning**
   - Segments partitioned by month
   - Old partitions moved to cold storage

---

### 1.3 Storage Cost Explosion

| Attribute | Value |
|-----------|-------|
| **Problem** | Video storage costs grow exponentially as platform scales |
| **Probability** | High |
| **Impact** | High |
| **Priority** | P1 |

**Causes:**
- Each segment = 10-100MB of video
- Users generate content without cleanup
- HLS variants multiply storage (720p + 1080p)

**Cost Projection:**
| Users | Segments/Month | Storage Growth | Monthly Cost |
|-------|----------------|----------------|--------------|
| 10K | 50K | 2.5TB | $60 |
| 100K | 500K | 25TB | $600 |
| 1M | 5M | 250TB | $6,000 |

**Solutions:**

1. **Tiered Storage**
   ```yaml
   # S3 Lifecycle Policy
   - Transition to IA after 30 days
   - Transition to Glacier after 90 days
   - Delete failed/orphaned after 7 days
   ```

2. **Single Resolution for Old Content**
   - Keep only 720p for scenes older than 6 months
   - Re-transcode on demand if needed

3. **Content Quotas**
   - Free users: 10 active scenes, 50 segments
   - Paid users: Unlimited scenes, 500 segments
   - Archive inactive scenes after 90 days

4. **Deduplication**
   - Hash video frames for near-duplicate detection
   - Store base + delta for similar scenes

5. **CDN Cost Management**
   - Use origin shield to reduce S3 requests
   - Cache aggressively at edge (1 year for segments)

---

### 1.4 CDN/Network Failures

| Attribute | Value |
|-----------|-------|
| **Problem** | CDN outage or region failure disrupts video playback globally |
| **Probability** | Low |
| **Impact** | Critical |
| **Priority** | P2 |

**Solutions:**

1. **Multi-CDN Strategy**
   - Primary: CloudFront
   - Fallback: Cloudflare
   - Client-side failover logic

2. **Origin Redundancy**
   - S3 cross-region replication
   - Failover origin group in CloudFront

3. **Graceful Degradation**
   - Show cached thumbnails if video unavailable
   - Queue playback requests for retry

---

## 2. Application Risks

### 2.1 Generation Failures

| Attribute | Value |
|-----------|-------|
| **Problem** | AI video generation fails frequently, leaving users with incomplete scenes |
| **Probability** | Medium |
| **Impact** | High |
| **Priority** | P1 |

**Causes:**
- AI provider API errors/timeouts
- Content rejected by safety filters
- Resource exhaustion during generation

**Solutions:**

1. **Retry Strategy**
   ```python
   @celery.task(
       bind=True,
       max_retries=3,
       default_retry_delay=60,
       retry_backoff=True,
       retry_jitter=True,
   )
   def generate_video(self, job_id: str):
       try:
           # ... generation logic
       except (APIError, TimeoutError) as e:
           raise self.retry(exc=e)
   ```

2. **Dead Letter Queue**
   - Failed jobs go to DLQ after 3 retries
   - Manual review and batch retry

3. **Fallback Providers**
   - Primary: RunwayML
   - Fallback: Pika Labs
   - Emergency: Static image slideshow

4. **Partial Success**
   - Save progress at each stage
   - Allow resume from last checkpoint

---

### 2.2 Character Drift / Continuity Breaks

| Attribute | Value |
|-----------|-------|
| **Problem** | Characters change appearance, personality, or context across segments, breaking immersion |
| **Probability** | High |
| **Impact** | Medium |
| **Priority** | P1 |

**Causes:**
- Scene Bible not passed to generator
- Generator ignores continuity context
- Reference images don't capture character details

**Solutions:**

1. **Strict Continuity Validation**
   ```python
   class ContinuityValidator:
       def validate(self, new_segment: Segment, bible: SceneBible) -> List[Violation]:
           violations = []
           
           # Check character consistency
           for char in new_segment.characters:
               bible_char = bible.characters.get(char.entity_id)
               if bible_char:
                   violations.extend(self._check_character(char, bible_char))
           
           return violations
   ```

2. **Entity ID System**
   - Every character/object gets unique ID
   - ID persists across all segments
   - Generator must reference by ID

3. **Reference Frame System**
   - Store canonical frames for each character
   - Pass reference frames to generator
   - Visual consistency checking via CLIP

4. **User Correction Flow**
   - Flag continuity issues
   - Regenerate with stricter constraints
   - Update Scene Bible with corrections

---

### 2.3 Concurrency / Fork Conflicts

| Attribute | Value |
|-----------|-------|
| **Problem** | Multiple users try to continue the same scene simultaneously, causing conflicts |
| **Probability** | Medium |
| **Impact** | Medium |
| **Priority** | P2 |

**Solutions:**

1. **Optimistic Concurrency**
   ```sql
   -- Check scene version before starting
   SELECT version FROM scenes WHERE id = $1;
   
   -- Validate version unchanged when submitting
   UPDATE scenes 
   SET version = version + 1 
   WHERE id = $1 AND version = $2;
   ```

2. **Branching Model**
   - Allow forks at any segment
   - No locking required
   - Show "also continued by..." UI

3. **Merge Preview**
   - Show other in-progress continuations
   - Alert user before conflict
   - Option to wait or fork

---

### 2.4 Long Scene Playback

| Attribute | Value |
|-----------|-------|
| **Problem** | Scenes with 100+ segments have poor playback UX (long load, seek issues) |
| **Probability** | Medium |
| **Impact** | Medium |
| **Priority** | P2 |

**Solutions:**

1. **On-Demand Compilation**
   - Compile segments into 5-10 minute chunks
   - Pre-generate first chunk, lazy-load rest

2. **Smart Buffering**
   ```typescript
   class ScenePlayer {
     private bufferAhead = 3;  // segments
     
     async play(sceneId: string) {
       const segments = await this.getSegmentList(sceneId);
       
       // Buffer first N segments
       await Promise.all(
         segments.slice(0, this.bufferAhead).map(s => this.preload(s))
       );
       
       // Start playback, continue buffering
       this.playSegment(0);
       this.bufferLoop(segments, this.bufferAhead);
     }
   }
   ```

3. **Chapter Markers**
   - Auto-generate chapters at natural breaks
   - Quick seek to chapters

4. **Playlist Mode**
   - Treat each segment as playlist item
   - Better seek performance

---

## 3. Business Risks

### 3.1 AI Provider Lock-in

| Attribute | Value |
|-----------|-------|
| **Problem** | Heavy dependence on single AI provider (e.g., RunwayML) creates risk if pricing changes or service degrades |
| **Probability** | Medium |
| **Impact** | High |
| **Priority** | P2 |

**Solutions:**

1. **Provider Abstraction**
   ```python
   class VideoGeneratorInterface(Protocol):
       async def generate(self, prompt: str, config: Config) -> VideoResult:
           ...
   
   class RunwayGenerator(VideoGeneratorInterface): ...
   class PikaGenerator(VideoGeneratorInterface): ...
   class StabilityGenerator(VideoGeneratorInterface): ...
   
   # Factory pattern for provider selection
   def get_generator(provider: str = None) -> VideoGeneratorInterface:
       provider = provider or settings.DEFAULT_PROVIDER
       return PROVIDERS[provider]()
   ```

2. **Multi-Provider Strategy**
   - Route 80% to primary, 20% to secondary
   - Automatic failover on errors
   - A/B test quality periodically

3. **Cost Monitoring**
   - Track cost per generation
   - Alert on cost spike
   - Auto-switch if provider costs exceed threshold

---

### 3.2 Abuse / Inappropriate Content

| Attribute | Value |
|-----------|-------|
| **Problem** | Users generate harmful, illegal, or NSFW content that damages platform reputation and creates legal liability |
| **Probability** | High |
| **Impact** | Critical |
| **Priority** | P1 |

**Solutions:**

1. **Pre-Generation Filtering**
   - Check prompt against blocklist
   - AI safety classifier on user text
   - Reject obviously harmful requests

2. **Post-Generation Moderation**
   - AI-based video analysis
   - Human review for flagged content
   - Quarantine until approved

3. **User Trust System**
   - New users: All content moderated
   - Trusted users: Spot-check only
   - Escalating restrictions for violations

4. **Clear ToS and Reporting**
   - Explicit content policy
   - Easy report mechanism
   - Fast response to reports (< 24 hours)

5. **Legal Compliance**
   - DMCA takedown process
   - CSAM detection and reporting
   - Law enforcement cooperation procedures

---

### 3.3 Copyright Infringement

| Attribute | Value |
|-----------|-------|
| **Problem** | Users generate content that infringes on copyrighted characters, stories, or music |
| **Probability** | High |
| **Impact** | High |
| **Priority** | P1 |

**Solutions:**

1. **Content Fingerprinting**
   - Video fingerprint against known copyrighted content
   - Audio fingerprint for music detection

2. **Prompt Filtering**
   - Block generation requests for known copyrighted characters
   - "Mickey Mouse", "Harry Potter" → rejected

3. **DMCA Process**
   - Designated DMCA agent
   - Clear takedown procedure
   - Counter-notification support

4. **Safe Harbor Compliance**
   - User-generated content disclaimer
   - Prompt removal on valid claims
   - Repeat infringer policy

---

## 4. Operational Risks

### 4.1 Data Loss

| Attribute | Value |
|-----------|-------|
| **Problem** | Database corruption or disaster causes permanent loss of user content |
| **Probability** | Low |
| **Impact** | Critical |
| **Priority** | P1 |

**Solutions:**

1. **Backup Strategy**
   - Continuous WAL archiving to S3
   - Daily full backups retained 30 days
   - Point-in-time recovery capability

2. **Geographic Redundancy**
   - Primary in us-east-1
   - Hot standby in us-west-2
   - Automated failover via RDS Multi-AZ

3. **S3 Resilience**
   - Cross-region replication for videos
   - Versioning enabled
   - Object lock for critical assets

4. **Regular DR Testing**
   - Quarterly restore tests
   - Annual full DR simulation

---

### 4.2 Security Breach

| Attribute | Value |
|-----------|-------|
| **Problem** | Unauthorized access to user data, credentials, or administrative functions |
| **Probability** | Low |
| **Impact** | Critical |
| **Priority** | P1 |

**Solutions:**

1. **Defense in Depth**
   - WAF in front of API
   - VPC isolation for databases
   - Encryption at rest and in transit

2. **Access Control**
   - Least privilege IAM roles
   - MFA required for all admin access
   - Regular access audits

3. **Vulnerability Management**
   - Automated dependency scanning
   - Regular penetration testing
   - Bug bounty program

4. **Incident Response**
   - Documented IR playbook
   - 24/7 on-call rotation
   - Breach notification process

---

## Risk Summary Matrix

| Risk | Probability | Impact | Priority | Primary Mitigation |
|------|-------------|--------|----------|-------------------|
| Queue Overload | High | High | P1 | Auto-scaling + Rate Limiting |
| Database Hotspots | Medium | High | P1 | Caching + Read Replicas |
| Storage Cost Explosion | High | High | P1 | Tiered Storage + Quotas |
| Generation Failures | Medium | High | P1 | Retry + Fallback Providers |
| Character Drift | High | Medium | P1 | Entity IDs + Validation |
| Abuse/Inappropriate Content | High | Critical | P1 | Multi-layer Moderation |
| Copyright Infringement | High | High | P1 | Fingerprinting + DMCA |
| Data Loss | Low | Critical | P1 | Backups + Geo-redundancy |
| Security Breach | Low | Critical | P1 | Defense in Depth |
| CDN Failures | Low | Critical | P2 | Multi-CDN + Failover |
| Concurrency Conflicts | Medium | Medium | P2 | Branching Model |
| Long Scene Playback | Medium | Medium | P2 | Chunking + Smart Buffer |
| AI Provider Lock-in | Medium | High | P2 | Provider Abstraction |
