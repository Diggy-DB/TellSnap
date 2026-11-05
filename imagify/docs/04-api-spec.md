# 04 - API Specification

> Complete REST API specification with endpoints, request/response examples, and error handling.

---

## 1. API Conventions

### Base URL
```
Production: https://api.storyforge.io/api/v1
Development: http://localhost:4000/api/v1
```

### Authentication
- Bearer token in `Authorization` header
- Format: `Authorization: Bearer <jwt_token>`
- Tokens expire after 24 hours (refresh available)

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g., version mismatch) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706745600
```

---

## 2. Authentication Endpoints

### POST /auth/signup
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "username": "storyteller42",
  "displayName": "Story Teller"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "username": "storyteller42",
      "displayName": "Story Teller",
      "avatarUrl": null,
      "createdAt": "2026-01-31T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-02-01T10:00:00Z"
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Invalid input
- `409 EMAIL_EXISTS` - Email already registered
- `409 USERNAME_EXISTS` - Username taken

---

### POST /auth/login
Authenticate and receive token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "username": "storyteller42",
      "displayName": "Story Teller",
      "avatarUrl": "https://cdn.storyforge.io/avatars/usr_abc123.jpg",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-02-01T10:00:00Z"
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` - Wrong email/password

---

### POST /auth/logout
Invalidate current token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### GET /auth/me
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "username": "storyteller42",
    "displayName": "Story Teller",
    "avatarUrl": "https://cdn.storyforge.io/avatars/usr_abc123.jpg",
    "bio": "I love collaborative storytelling!",
    "role": "user",
    "createdAt": "2026-01-31T10:00:00Z",
    "stats": {
      "scenesCreated": 5,
      "segmentsContributed": 23,
      "ideasSubmitted": 12
    }
  }
}
```

---

### POST /auth/refresh
Refresh authentication token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token...",
    "expiresAt": "2026-02-02T10:00:00Z"
  }
}
```

---

## 3. Topics & Categories

### GET /topics
List all active topics.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "top_scifi",
      "name": "Science Fiction",
      "slug": "science-fiction",
      "description": "Stories set in futuristic or space settings",
      "iconUrl": "https://cdn.storyforge.io/icons/scifi.png",
      "sceneCount": 1523,
      "isCurated": true
    },
    {
      "id": "top_fantasy",
      "name": "Fantasy",
      "slug": "fantasy",
      "description": "Magic, mythical creatures, and epic quests",
      "iconUrl": "https://cdn.storyforge.io/icons/fantasy.png",
      "sceneCount": 2341,
      "isCurated": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

### GET /topics/:id
Get topic details with categories.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "top_scifi",
    "name": "Science Fiction",
    "slug": "science-fiction",
    "description": "Stories set in futuristic or space settings",
    "iconUrl": "https://cdn.storyforge.io/icons/scifi.png",
    "sceneCount": 1523,
    "categories": [
      {
        "id": "cat_space",
        "name": "Space Opera",
        "slug": "space-opera",
        "description": "Epic adventures across galaxies"
      },
      {
        "id": "cat_cyber",
        "name": "Cyberpunk",
        "slug": "cyberpunk",
        "description": "High tech, low life"
      }
    ]
  }
}
```

---

### POST /topics
Create user-submitted topic (requires moderation).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Solarpunk",
  "description": "Optimistic eco-futurism with sustainable technology"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "utop_xyz789",
    "name": "Solarpunk",
    "description": "Optimistic eco-futurism with sustainable technology",
    "status": "pending",
    "message": "Your topic suggestion is under review"
  }
}
```

---

### GET /categories
List all categories (optionally filter by topic).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| topicId | uuid | Filter by topic |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_space",
      "topicId": "top_scifi",
      "name": "Space Opera",
      "slug": "space-opera"
    }
  ]
}
```

---

## 4. Ideas

### GET /ideas
List ideas with filtering and sorting.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page (max 100) |
| topicId | uuid | - | Filter by topic |
| categoryId | uuid | - | Filter by category |
| userId | uuid | - | Filter by author |
| sort | string | "newest" | newest, popular, trending |
| tags | string | - | Comma-separated tags |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "idea_abc123",
      "title": "The Last Starship",
      "prompt": "In the year 3042, humanity's last starship discovers a signal from Earth's original colony ship...",
      "topic": {
        "id": "top_scifi",
        "name": "Science Fiction"
      },
      "category": {
        "id": "cat_space",
        "name": "Space Opera"
      },
      "author": {
        "id": "usr_def456",
        "username": "spacewriter",
        "avatarUrl": "https://cdn.storyforge.io/avatars/usr_def456.jpg"
      },
      "tags": ["space", "mystery", "colony"],
      "sceneCount": 3,
      "likeCount": 45,
      "createdAt": "2026-01-30T15:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 342,
    "hasMore": true
  }
}
```

---

### POST /ideas
Submit a new idea.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "The Memory Merchant",
  "prompt": "In a world where memories can be bought and sold, a young woman discovers she possesses a memory that everyone wants—but she can't access it herself.",
  "topicId": "top_scifi",
  "categoryId": "cat_cyber",
  "tags": ["memory", "noir", "mystery"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "idea_new123",
    "title": "The Memory Merchant",
    "prompt": "In a world where memories can be bought and sold...",
    "topic": {
      "id": "top_scifi",
      "name": "Science Fiction"
    },
    "category": {
      "id": "cat_cyber",
      "name": "Cyberpunk"
    },
    "author": {
      "id": "usr_abc123",
      "username": "storyteller42"
    },
    "tags": ["memory", "noir", "mystery"],
    "moderationStatus": "pending",
    "createdAt": "2026-01-31T10:30:00Z"
  }
}
```

---

### GET /ideas/:id
Get idea details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "idea_abc123",
    "title": "The Last Starship",
    "prompt": "In the year 3042...",
    "topic": { "id": "top_scifi", "name": "Science Fiction" },
    "category": { "id": "cat_space", "name": "Space Opera" },
    "author": {
      "id": "usr_def456",
      "username": "spacewriter",
      "avatarUrl": "..."
    },
    "tags": ["space", "mystery"],
    "sceneCount": 3,
    "likeCount": 45,
    "viewCount": 1234,
    "createdAt": "2026-01-30T15:30:00Z",
    "scenes": [
      {
        "id": "scn_001",
        "title": "The Signal",
        "segmentCount": 5,
        "thumbnailUrl": "..."
      }
    ]
  }
}
```

---

## 5. Scenes

### GET /scenes
List scenes with filtering.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page |
| topicId | uuid | - | Filter by topic |
| ideaId | uuid | - | Filter by idea |
| userId | uuid | - | Filter by creator |
| sort | string | "recent" | recent, popular, longest |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "scn_abc123",
      "title": "The Signal - Chapter One",
      "description": "Following the mysterious transmission...",
      "idea": {
        "id": "idea_abc123",
        "title": "The Last Starship"
      },
      "topic": {
        "id": "top_scifi",
        "name": "Science Fiction"
      },
      "creator": {
        "id": "usr_def456",
        "username": "spacewriter"
      },
      "segmentCount": 5,
      "totalDuration": 245,
      "contributorCount": 3,
      "thumbnailUrl": "https://cdn.storyforge.io/scenes/scn_abc123/thumb.jpg",
      "likeCount": 89,
      "viewCount": 2341,
      "lastSegmentAt": "2026-01-31T08:00:00Z",
      "createdAt": "2026-01-28T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

---

### POST /scenes
Create a new scene from an idea.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "ideaId": "idea_abc123",
  "title": "The Signal - Chapter One",
  "initialScript": "Captain Maya Chen stared at the flickering display. After 500 years of silence, the colony ship Aurora had finally sent a message. But the coordinates didn't match any known location..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "scene": {
      "id": "scn_new456",
      "title": "The Signal - Chapter One",
      "status": "active",
      "bibleVersion": 1
    },
    "job": {
      "id": "job_xyz789",
      "status": "queued",
      "message": "Processing your scene..."
    }
  }
}
```

---

### GET /scenes/:id
Get scene details with segments.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| includeSegments | bool | true | Include segment list |
| segmentLimit | int | 50 | Max segments to return |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "scn_abc123",
    "title": "The Signal - Chapter One",
    "description": "Following the mysterious transmission...",
    "idea": {
      "id": "idea_abc123",
      "title": "The Last Starship",
      "prompt": "In the year 3042..."
    },
    "topic": {
      "id": "top_scifi",
      "name": "Science Fiction"
    },
    "creator": {
      "id": "usr_def456",
      "username": "spacewriter"
    },
    "status": "active",
    "bibleVersion": 5,
    "segmentCount": 5,
    "totalDuration": 245,
    "contributorCount": 3,
    "thumbnailUrl": "https://cdn.storyforge.io/scenes/scn_abc123/thumb.jpg",
    "segments": [
      {
        "id": "seg_001",
        "sequence": 1,
        "thumbnailUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_001/thumb.jpg",
        "duration": 45,
        "contributor": {
          "id": "usr_def456",
          "username": "spacewriter"
        },
        "createdAt": "2026-01-28T12:00:00Z"
      },
      {
        "id": "seg_002",
        "sequence": 2,
        "thumbnailUrl": "...",
        "duration": 52,
        "contributor": {
          "id": "usr_ghi789",
          "username": "cosmicwriter"
        },
        "createdAt": "2026-01-29T10:00:00Z"
      }
    ],
    "createdAt": "2026-01-28T12:00:00Z",
    "lastSegmentAt": "2026-01-31T08:00:00Z"
  }
}
```

---

### POST /scenes/:id/continue
Submit a continuation for the scene. Returns immediately with jobId.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "continuationText": "Maya's hand trembled as she decoded the message. The Aurora wasn't asking for help—it was sending a warning. 'Do not come home,' it read. 'Earth is no longer Earth.'",
  "bibleVersion": 5
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "job_cont123",
      "status": "queued",
      "stage": "pending",
      "progress": 0,
      "message": "Your continuation is being processed",
      "estimatedTime": 120
    },
    "sceneId": "scn_abc123",
    "bibleVersion": 5
  }
}
```

**Errors:**
- `409 BIBLE_VERSION_MISMATCH` - Scene was updated since last fetch

**Conflict Response (409):**
```json
{
  "success": false,
  "error": {
    "code": "BIBLE_VERSION_MISMATCH",
    "message": "Scene was updated by another user",
    "details": {
      "yourVersion": 5,
      "currentVersion": 6,
      "suggestion": "Fetch latest scene and resubmit"
    }
  }
}
```

---

### GET /scenes/:id/bible
Get the Scene Bible for a scene.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sceneId": "scn_abc123",
    "version": 5,
    "characters": [
      {
        "entityId": "char_maya",
        "canonicalName": "Maya Chen",
        "aliases": ["Captain Chen", "Maya"],
        "description": "Captain of the Horizon, 45 years old, stern but compassionate",
        "traits": ["determined", "analytical", "haunted by past"],
        "relationships": [
          {
            "targetEntityId": "char_kai",
            "relationshipType": "first officer"
          }
        ],
        "introducedInSegment": 1,
        "isActive": true
      },
      {
        "entityId": "char_kai",
        "canonicalName": "Kai Okonkwo",
        "aliases": ["Kai", "First Officer Okonkwo"],
        "description": "First officer, 32 years old, optimistic and resourceful",
        "traits": ["loyal", "clever", "idealistic"],
        "introducedInSegment": 1,
        "isActive": true
      }
    ],
    "setting": {
      "primaryLocation": "Starship Horizon",
      "timePeriod": "Year 3042",
      "worldRules": [
        "FTL travel takes months, not instant",
        "AI is sentient but regulated",
        "Earth lost contact with colonies 500 years ago"
      ],
      "locations": [
        {
          "name": "Bridge of the Horizon",
          "description": "Command center with panoramic viewscreen"
        }
      ]
    },
    "timeline": {
      "currentPoint": "Day 1 after receiving the signal",
      "majorEvents": [
        {
          "segmentNumber": 1,
          "event": "Mysterious signal received from Aurora",
          "consequences": "Crew debates whether to investigate"
        }
      ]
    },
    "plotThreads": [
      {
        "id": "thread_signal",
        "description": "Mystery of the Aurora's warning",
        "status": "active"
      }
    ],
    "styleGuide": {
      "tone": "tense, mysterious",
      "genre": "space opera / mystery",
      "visualStyle": "dark, atmospheric",
      "narrativeStyle": "third person limited (Maya)"
    },
    "updatedAt": "2026-01-31T08:00:00Z"
  }
}
```

---

### GET /scenes/:id/playlist
Get playback playlist for the scene.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sceneId": "scn_abc123",
    "title": "The Signal - Chapter One",
    "totalDuration": 245,
    "segments": [
      {
        "id": "seg_001",
        "sequence": 1,
        "duration": 45,
        "hlsUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_001/master.m3u8",
        "thumbnailUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_001/thumb.jpg",
        "startTime": 0
      },
      {
        "id": "seg_002",
        "sequence": 2,
        "duration": 52,
        "hlsUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_002/master.m3u8",
        "thumbnailUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_002/thumb.jpg",
        "startTime": 45
      }
    ]
  }
}
```

---

## 6. Jobs

### GET /jobs/:id
Get job status and details.

**Response (200) - Processing:**
```json
{
  "success": true,
  "data": {
    "id": "job_cont123",
    "sceneId": "scn_abc123",
    "status": "processing",
    "stage": "video_generation",
    "progress": 65,
    "message": "Generating video segment...",
    "createdAt": "2026-01-31T10:00:00Z",
    "startedAt": "2026-01-31T10:00:05Z"
  }
}
```

**Response (200) - Completed:**
```json
{
  "success": true,
  "data": {
    "id": "job_cont123",
    "sceneId": "scn_abc123",
    "status": "final_ready",
    "stage": "completed",
    "progress": 100,
    "message": "Segment created successfully",
    "result": {
      "segmentId": "seg_006",
      "videoUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_006/master.m3u8",
      "thumbnailUrl": "https://cdn.storyforge.io/scenes/scn_abc123/seg_006/thumb.jpg",
      "duration": 48,
      "bibleVersion": 6
    },
    "createdAt": "2026-01-31T10:00:00Z",
    "startedAt": "2026-01-31T10:00:05Z",
    "completedAt": "2026-01-31T10:02:15Z"
  }
}
```

**Response (200) - Failed:**
```json
{
  "success": true,
  "data": {
    "id": "job_cont123",
    "sceneId": "scn_abc123",
    "status": "failed",
    "stage": "continuity_validation",
    "progress": 30,
    "message": "Continuity validation failed",
    "error": {
      "code": "CONTINUITY_VIOLATION",
      "message": "Script contains contradictions with Scene Bible",
      "issues": [
        {
          "type": "name_drift",
          "severity": "error",
          "description": "Character 'Captain Chen' referred to as 'Captain Williams'",
          "suggestion": "Use 'Captain Chen' or 'Maya' for consistency"
        }
      ]
    },
    "retryCount": 0,
    "maxRetries": 3,
    "createdAt": "2026-01-31T10:00:00Z"
  }
}
```

---

### GET /jobs/:id/progress
Get detailed progress with WebSocket upgrade option.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "job_cont123",
    "status": "processing",
    "progress": 45,
    "stages": [
      { "name": "script_expansion", "status": "completed", "duration": 8 },
      { "name": "continuity_validation", "status": "completed", "duration": 2 },
      { "name": "video_generation", "status": "in_progress", "progress": 40 },
      { "name": "upload", "status": "pending" },
      { "name": "finalization", "status": "pending" }
    ],
    "wsUrl": "wss://api.storyforge.io/ws/jobs/job_cont123"
  }
}
```

---

### POST /jobs/:id/retry
Retry a failed job.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "modifiedText": "Maya's hand trembled as she decoded the message..."
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "id": "job_cont123",
    "status": "queued",
    "retryCount": 1,
    "message": "Job requeued for processing"
  }
}
```

---

## 7. Moderation

### POST /report
Report content for moderation.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "targetType": "segment",
  "targetId": "seg_006",
  "reason": "inappropriate_content",
  "description": "This segment contains content that violates community guidelines"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "reportId": "rpt_abc123",
    "status": "pending",
    "message": "Thank you for your report. Our team will review it."
  }
}
```

**Valid Reason Values:**
- `inappropriate_content`
- `copyright_violation`
- `spam`
- `harassment`
- `misinformation`
- `other`

---

### GET /moderation/queue (Admin)
Get pending moderation items.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | pending | pending, reviewing, resolved |
| targetType | string | - | Filter by type |
| page | int | 1 | Page number |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "rpt_abc123",
      "targetType": "segment",
      "targetId": "seg_006",
      "reporter": {
        "id": "usr_reporter",
        "username": "concerned_user"
      },
      "reason": "inappropriate_content",
      "description": "...",
      "status": "pending",
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

### POST /moderation/:id/action (Admin)
Take action on moderation item.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request:**
```json
{
  "action": "remove_content",
  "notes": "Confirmed violation of community guidelines"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "actionTaken": "remove_content",
    "resolvedAt": "2026-01-31T11:00:00Z"
  }
}
```

**Valid Actions:**
- `dismiss` - Report is invalid
- `warn_user` - Issue warning to content creator
- `remove_content` - Remove the content
- `ban_user` - Ban the content creator

---

## 8. User Profile

### GET /users/:id
Get public user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_def456",
    "username": "spacewriter",
    "displayName": "Space Writer",
    "avatarUrl": "https://cdn.storyforge.io/avatars/usr_def456.jpg",
    "bio": "Writing stories among the stars",
    "createdAt": "2025-06-15T10:00:00Z",
    "stats": {
      "scenesCreated": 12,
      "segmentsContributed": 45,
      "ideasSubmitted": 8,
      "totalLikes": 234
    }
  }
}
```

---

### PATCH /users/me
Update current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "displayName": "Updated Name",
  "bio": "New bio text",
  "avatarUrl": "https://cdn.storyforge.io/avatars/new.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "username": "storyteller42",
    "displayName": "Updated Name",
    "bio": "New bio text",
    "avatarUrl": "https://cdn.storyforge.io/avatars/new.jpg"
  }
}
```

---

## 9. WebSocket Events

### Connection
```javascript
const ws = new WebSocket('wss://api.storyforge.io/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'job',
    jobId: 'job_cont123',
    token: 'jwt_token_here'
  }));
};
```

### Job Progress Event
```json
{
  "type": "job_progress",
  "jobId": "job_cont123",
  "status": "processing",
  "stage": "video_generation",
  "progress": 65,
  "message": "Rendering frame 650 of 1000"
}
```

### Job Complete Event
```json
{
  "type": "job_complete",
  "jobId": "job_cont123",
  "status": "final_ready",
  "result": {
    "segmentId": "seg_006",
    "videoUrl": "...",
    "thumbnailUrl": "...",
    "duration": 48
  }
}
```

### Job Failed Event
```json
{
  "type": "job_failed",
  "jobId": "job_cont123",
  "error": {
    "code": "CONTINUITY_VIOLATION",
    "message": "...",
    "issues": [...]
  }
}
```

---

## 10. Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `UNAUTHORIZED` | 401 | No/invalid token |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `USERNAME_EXISTS` | 409 | Username taken |
| `BIBLE_VERSION_MISMATCH` | 409 | Optimistic lock conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `CONTINUITY_VIOLATION` | 422 | Script contradicts bible |
| `GENERATION_FAILED` | 500 | Video generation error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
