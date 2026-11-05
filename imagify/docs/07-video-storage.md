# 07 - Video Storage & Streaming

> Segment strategy, HLS streaming, CDN configuration, and storage conventions.

---

## 1. Overview

Video storage is designed for:
- **Immutable segments**: Each segment is stored once, never modified
- **HLS streaming**: Adaptive bitrate for all devices
- **CDN delivery**: Global edge caching for low latency
- **Massive scale**: Designed for petabytes of video

---

## 2. Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         S3-Compatible Storage                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  BUCKET: storyforge-videos                                    │   │
│  │  (Primary video storage)                                      │   │
│  │                                                               │   │
│  │  /{sceneId}/                                                  │   │
│  │      /{segmentId}/                                            │   │
│  │          master.m3u8        # HLS master playlist             │   │
│  │          720p.m3u8          # 720p variant playlist           │   │
│  │          1080p.m3u8         # 1080p variant playlist          │   │
│  │          720p_0001.ts       # HLS segment files               │   │
│  │          720p_0002.ts                                         │   │
│  │          1080p_0001.ts                                        │   │
│  │          1080p_0002.ts                                        │   │
│  │          thumbnail.jpg      # Segment thumbnail               │   │
│  │          thumbnail_large.jpg                                  │   │
│  │          source.mp4         # Original (for re-encoding)      │   │
│  │          metadata.json      # Segment metadata                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  BUCKET: storyforge-assets                                    │   │
│  │  (Static assets, thumbnails, references)                      │   │
│  │                                                               │   │
│  │  /avatars/{userId}.jpg                                        │   │
│  │  /topics/{topicId}/icon.png                                   │   │
│  │  /scenes/{sceneId}/                                           │   │
│  │      poster.jpg             # Scene poster image              │   │
│  │      reference/                                               │   │
│  │          char_{entityId}_portrait.png                         │   │
│  │          style_frame.png                                      │   │
│  │          voice_anchor.wav                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  BUCKET: storyforge-exports                                   │   │
│  │  (On-demand compiled videos)                                  │   │
│  │                                                               │   │
│  │  /{sceneId}/                                                  │   │
│  │      full_720p.mp4          # Compiled full scene             │   │
│  │      full_1080p.mp4                                           │   │
│  │      export_manifest.json   # What's included                 │   │
│  │      created_at: {timestamp}                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  BUCKET: storyforge-internal                                  │   │
│  │  (Processing artifacts - not public)                          │   │
│  │                                                               │   │
│  │  /jobs/{jobId}/                                               │   │
│  │      raw_output.mp4         # Generator output                │   │
│  │      transcode_log.txt                                        │   │
│  │      frames/                # Extracted frames                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Path Conventions

### 3.1 Video Segment Path

```
videos/{sceneId}/{segmentId}/

Example:
videos/scn_abc123/seg_xyz789/master.m3u8
```

### 3.2 CDN URL Mapping

```
Storage:  s3://storyforge-videos/scn_abc123/seg_xyz789/master.m3u8
CDN URL:  https://cdn.storyforge.io/v/scn_abc123/seg_xyz789/master.m3u8
```

### 3.3 Metadata JSON

```json
{
  "segmentId": "seg_xyz789",
  "sceneId": "scn_abc123",
  "sequence": 5,
  "duration": 48.5,
  "createdAt": "2026-01-31T10:00:00Z",
  "encoding": {
    "codec": "h264",
    "profiles": ["720p", "1080p"],
    "audioCodec": "aac"
  },
  "files": {
    "source": "source.mp4",
    "master": "master.m3u8",
    "variants": {
      "720p": "720p.m3u8",
      "1080p": "1080p.m3u8"
    },
    "thumbnail": "thumbnail.jpg"
  },
  "fileSize": {
    "total": 52428800,
    "source": 41943040,
    "720p": 31457280,
    "1080p": 52428800
  }
}
```

---

## 4. HLS Streaming

### 4.1 HLS Structure

```
master.m3u8
├── 720p.m3u8 (1500kbps)
│   ├── 720p_0001.ts (4s)
│   ├── 720p_0002.ts (4s)
│   └── ...
└── 1080p.m3u8 (4000kbps)
    ├── 1080p_0001.ts (4s)
    ├── 1080p_0002.ts (4s)
    └── ...
```

### 4.2 Master Playlist

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
720p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p.m3u8
```

### 4.3 Variant Playlist

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD

#EXTINF:4.000,
720p_0001.ts
#EXTINF:4.000,
720p_0002.ts
#EXTINF:4.000,
720p_0003.ts
#EXTINF:2.500,
720p_0004.ts

#EXT-X-ENDLIST
```

### 4.4 HLS Builder Implementation

```python
# services/generator/src/video/hls_builder.py

import subprocess
import os
from dataclasses import dataclass

@dataclass
class HLSProfile:
    name: str
    resolution: tuple[int, int]
    bitrate: int
    audio_bitrate: int = 128

PROFILES = [
    HLSProfile('720p', (1280, 720), 1500000),
    HLSProfile('1080p', (1920, 1080), 4000000),
]

class HLSBuilder:
    def __init__(self, segment_duration: int = 4):
        self.segment_duration = segment_duration
    
    def transcode_to_hls(
        self,
        source_path: str,
        output_dir: str,
        profiles: list[HLSProfile] = PROFILES
    ) -> dict[str, str]:
        """Transcode source video to HLS format."""
        
        variant_playlists = {}
        
        for profile in profiles:
            output_path = os.path.join(output_dir, profile.name)
            os.makedirs(output_path, exist_ok=True)
            
            playlist_path = self._transcode_variant(
                source_path,
                output_path,
                profile
            )
            
            variant_playlists[profile.name] = playlist_path
        
        # Generate master playlist
        master_path = os.path.join(output_dir, 'master.m3u8')
        self._generate_master_playlist(master_path, profiles)
        
        return {
            'master': master_path,
            'variants': variant_playlists
        }
    
    def _transcode_variant(
        self,
        source: str,
        output_dir: str,
        profile: HLSProfile
    ) -> str:
        """Transcode to specific variant."""
        
        playlist_path = os.path.join(output_dir, f'{profile.name}.m3u8')
        segment_pattern = os.path.join(output_dir, f'{profile.name}_%04d.ts')
        
        cmd = [
            'ffmpeg', '-i', source,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-b:v', str(profile.bitrate),
            '-maxrate', str(int(profile.bitrate * 1.5)),
            '-bufsize', str(int(profile.bitrate * 2)),
            '-vf', f'scale={profile.resolution[0]}:{profile.resolution[1]}',
            '-c:a', 'aac',
            '-b:a', f'{profile.audio_bitrate}k',
            '-hls_time', str(self.segment_duration),
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', segment_pattern,
            playlist_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        return playlist_path
    
    def _generate_master_playlist(
        self,
        path: str,
        profiles: list[HLSProfile]
    ) -> None:
        """Generate master playlist."""
        
        lines = ['#EXTM3U', '#EXT-X-VERSION:3', '']
        
        for profile in profiles:
            w, h = profile.resolution
            codec = 'avc1.640028' if h >= 1080 else 'avc1.4d401f'
            
            lines.append(
                f'#EXT-X-STREAM-INF:BANDWIDTH={profile.bitrate},'
                f'RESOLUTION={w}x{h},'
                f'CODECS="{codec},mp4a.40.2"'
            )
            lines.append(f'{profile.name}/{profile.name}.m3u8')
            lines.append('')
        
        with open(path, 'w') as f:
            f.write('\n'.join(lines))
```

---

## 5. Scene Playlist

### 5.1 Scene Playlist JSON

The API returns a playlist JSON that the frontend uses to build continuous playback:

```json
{
  "sceneId": "scn_abc123",
  "title": "The Signal - Chapter One",
  "totalDuration": 245.5,
  "segmentCount": 5,
  "segments": [
    {
      "id": "seg_001",
      "sequence": 1,
      "duration": 45.0,
      "startTime": 0,
      "hlsUrl": "https://cdn.storyforge.io/v/scn_abc123/seg_001/master.m3u8",
      "thumbnailUrl": "https://cdn.storyforge.io/v/scn_abc123/seg_001/thumbnail.jpg",
      "contributor": {
        "id": "usr_def456",
        "username": "spacewriter"
      }
    },
    {
      "id": "seg_002",
      "sequence": 2,
      "duration": 52.0,
      "startTime": 45.0,
      "hlsUrl": "https://cdn.storyforge.io/v/scn_abc123/seg_002/master.m3u8",
      "thumbnailUrl": "https://cdn.storyforge.io/v/scn_abc123/seg_002/thumbnail.jpg",
      "contributor": {
        "id": "usr_ghi789",
        "username": "cosmicwriter"
      }
    }
  ],
  "updatedAt": "2026-01-31T08:00:00Z"
}
```

### 5.2 Client-Side Playlist Stitching

```typescript
// apps/web/src/components/ScenePlayer.tsx

import Hls from 'hls.js';

interface Segment {
  id: string;
  sequence: number;
  duration: number;
  startTime: number;
  hlsUrl: string;
}

class ScenePlayer {
  private hls: Hls;
  private video: HTMLVideoElement;
  private segments: Segment[];
  private currentSegmentIndex: number = 0;
  
  constructor(video: HTMLVideoElement, segments: Segment[]) {
    this.video = video;
    this.segments = segments;
    this.hls = new Hls();
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // When current segment ends, load next
    this.video.addEventListener('ended', () => {
      if (this.currentSegmentIndex < this.segments.length - 1) {
        this.loadSegment(this.currentSegmentIndex + 1);
      }
    });
    
    // Handle HLS errors
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.hls.recoverMediaError();
            break;
        }
      }
    });
  }
  
  loadSegment(index: number) {
    this.currentSegmentIndex = index;
    const segment = this.segments[index];
    
    this.hls.loadSource(segment.hlsUrl);
    this.hls.attachMedia(this.video);
    
    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      this.video.play();
    });
  }
  
  seekToTime(globalTime: number) {
    // Find which segment contains this time
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const segEnd = seg.startTime + seg.duration;
      
      if (globalTime >= seg.startTime && globalTime < segEnd) {
        if (i !== this.currentSegmentIndex) {
          this.loadSegment(i);
        }
        
        // Seek within segment
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.video.currentTime = globalTime - seg.startTime;
        });
        
        return;
      }
    }
  }
  
  getCurrentGlobalTime(): number {
    const seg = this.segments[this.currentSegmentIndex];
    return seg.startTime + this.video.currentTime;
  }
}
```

---

## 6. Thumbnail Generation

### 6.1 Thumbnail Extraction

```python
# services/generator/src/video/thumbnail.py

import subprocess
import os

def extract_thumbnail(
    video_path: str,
    output_path: str,
    time_offset: float = 2.0,  # Extract from 2 seconds in
    size: tuple[int, int] = (640, 360)
) -> str:
    """Extract thumbnail from video."""
    
    cmd = [
        'ffmpeg', '-i', video_path,
        '-ss', str(time_offset),
        '-vframes', '1',
        '-vf', f'scale={size[0]}:{size[1]}',
        '-q:v', '2',  # High quality JPEG
        output_path
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def extract_thumbnails_timeline(
    video_path: str,
    output_dir: str,
    interval: float = 10.0,  # Every 10 seconds
    size: tuple[int, int] = (160, 90)
) -> list[str]:
    """Extract thumbnails for video timeline scrubbing."""
    
    duration = get_video_duration(video_path)
    thumbnails = []
    
    for t in range(0, int(duration), int(interval)):
        output_path = os.path.join(output_dir, f'thumb_{t:04d}.jpg')
        extract_thumbnail(video_path, output_path, time_offset=t, size=size)
        thumbnails.append(output_path)
    
    return thumbnails
```

### 6.2 Thumbnail Sprite Sheet

For efficient timeline scrubbing, generate sprite sheets:

```python
def generate_sprite_sheet(
    thumbnails: list[str],
    output_path: str,
    grid: tuple[int, int] = (10, 10)
) -> str:
    """Combine thumbnails into a sprite sheet."""
    
    from PIL import Image
    
    thumb_width, thumb_height = 160, 90
    cols, rows = grid
    
    sheet = Image.new('RGB', (thumb_width * cols, thumb_height * rows))
    
    for i, thumb_path in enumerate(thumbnails[:cols * rows]):
        if i >= cols * rows:
            break
        
        thumb = Image.open(thumb_path)
        x = (i % cols) * thumb_width
        y = (i // cols) * thumb_height
        sheet.paste(thumb, (x, y))
    
    sheet.save(output_path, 'JPEG', quality=80)
    return output_path
```

---

## 7. CDN Configuration

### 7.1 CloudFront Setup

```hcl
# infra/terraform/cdn.tf

resource "aws_cloudfront_distribution" "videos" {
  origin {
    domain_name = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id   = "S3-storyforge-videos"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.videos.cloudfront_access_identity_path
    }
  }
  
  enabled             = true
  default_root_object = ""
  price_class         = "PriceClass_All"
  
  aliases = ["cdn.storyforge.io"]
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-storyforge-videos"
    
    forwarded_values {
      query_string = false
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400     # 1 day
    max_ttl                = 31536000  # 1 year
    compress               = true
  }
  
  # HLS segments - long cache
  ordered_cache_behavior {
    path_pattern     = "*.ts"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-storyforge-videos"
    
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    
    min_ttl                = 604800     # 1 week
    default_ttl            = 2592000    # 30 days
    max_ttl                = 31536000   # 1 year
    viewer_protocol_policy = "redirect-to-https"
  }
  
  # HLS playlists - moderate cache
  ordered_cache_behavior {
    path_pattern     = "*.m3u8"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-storyforge-videos"
    
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    
    min_ttl                = 3600       # 1 hour
    default_ttl            = 86400      # 1 day
    max_ttl                = 604800     # 1 week
    viewer_protocol_policy = "redirect-to-https"
  }
  
  # Thumbnails - moderate cache
  ordered_cache_behavior {
    path_pattern     = "*.jpg"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-storyforge-videos"
    
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
    
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 2592000
    viewer_protocol_policy = "redirect-to-https"
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  tags = {
    Environment = var.environment
  }
}
```

### 7.2 Cache Headers

```python
# S3 upload with cache headers
def upload_to_s3(
    path: str,
    content: bytes,
    content_type: str,
    cache_control: str
) -> str:
    """Upload file to S3 with proper cache headers."""
    
    s3_client.put_object(
        Bucket=VIDEOS_BUCKET,
        Key=path,
        Body=content,
        ContentType=content_type,
        CacheControl=cache_control
    )
    
    return f"https://cdn.storyforge.io/{path}"


# Upload HLS segment (long cache - immutable)
upload_to_s3(
    path=f"{scene_id}/{segment_id}/720p_0001.ts",
    content=segment_bytes,
    content_type="video/MP2T",
    cache_control="public, max-age=31536000, immutable"
)

# Upload master playlist (shorter cache)
upload_to_s3(
    path=f"{scene_id}/{segment_id}/master.m3u8",
    content=playlist_bytes,
    content_type="application/vnd.apple.mpegurl",
    cache_control="public, max-age=3600"
)

# Upload thumbnail
upload_to_s3(
    path=f"{scene_id}/{segment_id}/thumbnail.jpg",
    content=thumb_bytes,
    content_type="image/jpeg",
    cache_control="public, max-age=604800"
)
```

---

## 8. On-Demand Compilation

### 8.1 Full Scene Export

Users can request a compiled MP4 of an entire scene:

```python
# services/generator/src/video/compiler.py

class SceneCompiler:
    """Compile all segments into a single video."""
    
    async def compile_scene(
        self,
        scene_id: str,
        quality: str = '1080p'
    ) -> str:
        """Compile scene segments into single video."""
        
        # Get all segments
        segments = await db.segments.find_many(
            where={'scene_id': scene_id},
            order_by={'sequence': 'asc'}
        )
        
        # Download source files
        source_files = []
        for seg in segments:
            local_path = await self.download_segment(seg)
            source_files.append(local_path)
        
        # Create concat file
        concat_file = self.create_concat_file(source_files)
        
        # Compile
        output_path = f"/tmp/{scene_id}_full_{quality}.mp4"
        
        cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_file,
            '-c', 'copy',  # No re-encoding if same codec
            output_path
        ]
        
        subprocess.run(cmd, check=True)
        
        # Upload to exports bucket
        export_url = await self.upload_export(scene_id, output_path, quality)
        
        # Cleanup
        self.cleanup(source_files, concat_file, output_path)
        
        return export_url
    
    def create_concat_file(self, files: list[str]) -> str:
        """Create FFmpeg concat file."""
        concat_path = f"/tmp/concat_{uuid4()}.txt"
        
        with open(concat_path, 'w') as f:
            for file in files:
                f.write(f"file '{file}'\n")
        
        return concat_path
```

### 8.2 Export API

```typescript
// POST /scenes/:id/export
async function requestExport(
  sceneId: string,
  quality: '720p' | '1080p'
): Promise<ExportJob> {
  // Check if recent export exists
  const existing = await db.exports.findFirst({
    where: {
      scene_id: sceneId,
      quality,
      created_at: { gt: subHours(new Date(), 24) }
    }
  });
  
  if (existing) {
    return { 
      status: 'ready', 
      url: existing.url,
      createdAt: existing.created_at 
    };
  }
  
  // Create export job
  const job = await queue.add('compile-scene', {
    sceneId,
    quality
  });
  
  return {
    status: 'processing',
    jobId: job.id,
    estimatedTime: calculateEstimate(sceneId)
  };
}
```

---

## 9. Storage Lifecycle

### 9.1 S3 Lifecycle Policies

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id
  
  # Transition source files to cheaper storage
  rule {
    id     = "source-to-glacier"
    status = "Enabled"
    
    filter {
      prefix = "videos/"
      tag {
        key   = "type"
        value = "source"
      }
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
  
  # Keep HLS segments in standard (frequently accessed)
  rule {
    id     = "hls-segments"
    status = "Enabled"
    
    filter {
      prefix = "videos/"
      tag {
        key   = "type"
        value = "hls"
      }
    }
    
    # No transition - keep in standard
  }
  
  # Delete old exports
  rule {
    id     = "cleanup-exports"
    status = "Enabled"
    
    filter {
      prefix = "exports/"
    }
    
    expiration {
      days = 30
    }
  }
  
  # Delete internal processing files
  rule {
    id     = "cleanup-internal"
    status = "Enabled"
    
    filter {
      prefix = "internal/"
    }
    
    expiration {
      days = 7
    }
  }
}
```

### 9.2 Cleanup on Scene Deletion

```python
async def delete_scene_storage(scene_id: str) -> None:
    """Delete all storage for a scene."""
    
    # List all objects for scene
    objects = s3_client.list_objects_v2(
        Bucket=VIDEOS_BUCKET,
        Prefix=f"videos/{scene_id}/"
    )
    
    if objects.get('Contents'):
        delete_objects = [{'Key': obj['Key']} for obj in objects['Contents']]
        
        s3_client.delete_objects(
            Bucket=VIDEOS_BUCKET,
            Delete={'Objects': delete_objects}
        )
    
    # Also clean exports
    exports = s3_client.list_objects_v2(
        Bucket=EXPORTS_BUCKET,
        Prefix=f"exports/{scene_id}/"
    )
    
    if exports.get('Contents'):
        delete_objects = [{'Key': obj['Key']} for obj in exports['Contents']]
        
        s3_client.delete_objects(
            Bucket=EXPORTS_BUCKET,
            Delete={'Objects': delete_objects}
        )
    
    # Invalidate CDN cache
    await invalidate_cdn_cache(f"/v/{scene_id}/*")
```
