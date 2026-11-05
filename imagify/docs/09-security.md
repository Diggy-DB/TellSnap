# 09 - Security & Moderation

> Authentication, authorization, rate limiting, and content moderation.

---

## 1. Authentication

### 1.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Client    │───▶│  NextAuth   │───▶│   OAuth Provider        │  │
│  │             │◀───│             │◀───│   (Google/GitHub/etc)   │  │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘  │
│         │                 │                                          │
│         │                 ▼                                          │
│         │           ┌─────────────┐                                  │
│         │           │  Create/    │                                  │
│         │           │  Link User  │                                  │
│         │           └─────────────┘                                  │
│         │                 │                                          │
│         │                 ▼                                          │
│         │           ┌─────────────┐    ┌───────────────────────────┐│
│         │           │  Issue JWT  │───▶│   Access Token (15min)    ││
│         │           │  + Refresh  │    │   Refresh Token (7 days)  ││
│         │           └─────────────┘    └───────────────────────────┘│
│         │                 │                                          │
│         ▼                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Subsequent Requests:                                           ││
│  │  Authorization: Bearer <access_token>                           ││
│  │  Cookie: sf_session=<session_id>                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 JWT Configuration

```typescript
// packages/shared/src/auth/jwt.config.ts

export const JWT_CONFIG = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m',
    algorithm: 'RS256',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
    algorithm: 'RS256',
  },
};

// JWT payload interface
export interface JwtPayload {
  sub: string;        // User ID
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;        // Issued at
  exp: number;        // Expiration
  jti: string;        // JWT ID (for revocation)
}

// Token generation
export async function generateTokenPair(user: User): Promise<TokenPair> {
  const jti = randomUUID();
  
  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: getRolePermissions(user.role),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,  // 15 min
    jti,
  };
  
  const accessToken = jwt.sign(accessPayload, JWT_CONFIG.accessToken.secret, {
    algorithm: JWT_CONFIG.accessToken.algorithm,
  });
  
  const refreshToken = jwt.sign(
    { sub: user.id, jti },
    JWT_CONFIG.refreshToken.secret,
    {
      algorithm: JWT_CONFIG.refreshToken.algorithm,
      expiresIn: JWT_CONFIG.refreshToken.expiresIn,
    }
  );
  
  // Store refresh token hash for revocation
  await redis.setex(
    `refresh:${user.id}:${jti}`,
    7 * 24 * 60 * 60,  // 7 days
    'valid'
  );
  
  return { accessToken, refreshToken };
}
```

### 1.3 Session Management

```typescript
// apps/api/src/auth/session.service.ts

export class SessionService {
  private redis: Redis;
  
  async createSession(user: User, deviceInfo: DeviceInfo): Promise<Session> {
    const sessionId = randomUUID();
    
    const session: Session = {
      id: sessionId,
      userId: user.id,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      deviceInfo,
      ip: deviceInfo.ip,
    };
    
    await this.redis.setex(
      `session:${sessionId}`,
      24 * 60 * 60,  // 24 hours
      JSON.stringify(session)
    );
    
    // Track user's sessions for multi-device management
    await this.redis.sadd(`user:${user.id}:sessions`, sessionId);
    
    return session;
  }
  
  async validateSession(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (!data) return null;
    
    const session = JSON.parse(data) as Session;
    
    // Update last active
    session.lastActiveAt = new Date().toISOString();
    await this.redis.setex(
      `session:${sessionId}`,
      24 * 60 * 60,
      JSON.stringify(session)
    );
    
    return session;
  }
  
  async revokeSession(sessionId: string): Promise<void> {
    const data = await this.redis.get(`session:${sessionId}`);
    if (data) {
      const session = JSON.parse(data);
      await this.redis.srem(`user:${session.userId}:sessions`, sessionId);
    }
    await this.redis.del(`session:${sessionId}`);
  }
  
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    
    if (sessionIds.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const sessionId of sessionIds) {
        pipeline.del(`session:${sessionId}`);
      }
      pipeline.del(`user:${userId}:sessions`);
      await pipeline.exec();
    }
  }
}
```

---

## 2. Authorization (RBAC)

### 2.1 Role Definitions

```typescript
// packages/shared/src/auth/roles.ts

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  CREATOR = 'creator',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum Permission {
  // Scenes
  SCENE_VIEW = 'scene:view',
  SCENE_CREATE = 'scene:create',
  SCENE_EDIT_OWN = 'scene:edit:own',
  SCENE_EDIT_ANY = 'scene:edit:any',
  SCENE_DELETE_OWN = 'scene:delete:own',
  SCENE_DELETE_ANY = 'scene:delete:any',
  SCENE_CONTINUE = 'scene:continue',
  
  // Segments
  SEGMENT_CREATE = 'segment:create',
  SEGMENT_DELETE_OWN = 'segment:delete:own',
  SEGMENT_DELETE_ANY = 'segment:delete:any',
  
  // Topics/Ideas
  TOPIC_CREATE = 'topic:create',
  TOPIC_MANAGE = 'topic:manage',
  IDEA_CREATE = 'idea:create',
  IDEA_VOTE = 'idea:vote',
  
  // Moderation
  MOD_VIEW_FLAGS = 'moderation:view',
  MOD_RESOLVE_FLAGS = 'moderation:resolve',
  MOD_BAN_USER = 'moderation:ban',
  
  // Admin
  ADMIN_USERS = 'admin:users',
  ADMIN_CONFIG = 'admin:config',
  ADMIN_ANALYTICS = 'admin:analytics',
}

// Role -> Permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: [
    Permission.SCENE_VIEW,
  ],
  
  [UserRole.USER]: [
    Permission.SCENE_VIEW,
    Permission.SCENE_CREATE,
    Permission.SCENE_EDIT_OWN,
    Permission.SCENE_DELETE_OWN,
    Permission.SCENE_CONTINUE,
    Permission.SEGMENT_CREATE,
    Permission.SEGMENT_DELETE_OWN,
    Permission.IDEA_CREATE,
    Permission.IDEA_VOTE,
  ],
  
  [UserRole.CREATOR]: [
    // All USER permissions plus:
    ...ROLE_PERMISSIONS[UserRole.USER],
    Permission.TOPIC_CREATE,
  ],
  
  [UserRole.MODERATOR]: [
    // All CREATOR permissions plus:
    ...ROLE_PERMISSIONS[UserRole.CREATOR],
    Permission.SCENE_EDIT_ANY,
    Permission.SCENE_DELETE_ANY,
    Permission.SEGMENT_DELETE_ANY,
    Permission.MOD_VIEW_FLAGS,
    Permission.MOD_RESOLVE_FLAGS,
  ],
  
  [UserRole.ADMIN]: [
    // All permissions
    ...Object.values(Permission),
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
```

### 2.2 Permission Guards

```typescript
// apps/api/src/auth/guards/permission.guard.ts

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { hasPermission, Permission } from '@storyforge/shared';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return false;
    }
    
    return requiredPermissions.every(permission => 
      hasPermission(user.role, permission)
    );
  }
}

// Decorator
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Usage
@Controller('scenes')
export class ScenesController {
  @Post()
  @RequirePermissions(Permission.SCENE_CREATE)
  async createScene(@Body() dto: CreateSceneDto, @User() user: JwtPayload) {
    // ...
  }
  
  @Delete(':id')
  @RequirePermissions(Permission.SCENE_DELETE_ANY)
  async deleteScene(@Param('id') id: string) {
    // ...
  }
}
```

### 2.3 Resource-Based Authorization

```typescript
// apps/api/src/auth/guards/resource-owner.guard.ts

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private scenesService: ScenesService,
    private segmentsService: SegmentsService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) return false;
    
    // Admins and moderators can access any resource
    if ([UserRole.ADMIN, UserRole.MODERATOR].includes(user.role)) {
      return true;
    }
    
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());
    const resourceId = request.params.id;
    
    if (!resourceType || !resourceId) {
      return true;  // No resource check needed
    }
    
    switch (resourceType) {
      case 'scene':
        const scene = await this.scenesService.findById(resourceId);
        return scene?.userId === user.sub;
      
      case 'segment':
        const segment = await this.segmentsService.findById(resourceId);
        return segment?.userId === user.sub;
      
      default:
        return false;
    }
  }
}

// Decorator
export const CheckOwnership = (resourceType: string) =>
  SetMetadata('resourceType', resourceType);
```

---

## 3. Rate Limiting

### 3.1 Rate Limit Configuration

```typescript
// apps/api/src/rate-limit/rate-limit.config.ts

export interface RateLimitRule {
  key: string;
  points: number;      // Max requests
  duration: number;    // Time window in seconds
  blockDuration?: number;  // Block duration after limit exceeded
}

export const RATE_LIMITS: Record<string, RateLimitRule> = {
  // Global limits (per IP)
  global: {
    key: 'global',
    points: 1000,
    duration: 60,
  },
  
  // Authentication
  login: {
    key: 'login',
    points: 5,
    duration: 60,
    blockDuration: 300,  // 5 min block after 5 failed attempts
  },
  
  signup: {
    key: 'signup',
    points: 3,
    duration: 3600,  // 3 per hour
  },
  
  // Scene operations
  sceneCreate: {
    key: 'scene:create',
    points: 10,
    duration: 3600,  // 10 per hour
  },
  
  segmentCreate: {
    key: 'segment:create',
    points: 5,
    duration: 3600,  // 5 per hour (expensive)
  },
  
  // API general
  apiRead: {
    key: 'api:read',
    points: 100,
    duration: 60,  // 100 reads per minute
  },
  
  apiWrite: {
    key: 'api:write',
    points: 30,
    duration: 60,  // 30 writes per minute
  },
};
```

### 3.2 Rate Limiter Implementation

```typescript
// apps/api/src/rate-limit/rate-limit.service.ts

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitService {
  private limiters: Map<string, RateLimiterRedis> = new Map();
  
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {
    // Initialize limiters
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      this.limiters.set(name, new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `ratelimit:${config.key}`,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || 0,
      }));
    }
  }
  
  async consume(
    limitName: string,
    key: string,
    points: number = 1
  ): Promise<RateLimitResult> {
    const limiter = this.limiters.get(limitName);
    
    if (!limiter) {
      throw new Error(`Unknown rate limit: ${limitName}`);
    }
    
    try {
      const res = await limiter.consume(key, points);
      
      return {
        allowed: true,
        remaining: res.remainingPoints,
        resetAt: new Date(Date.now() + res.msBeforeNext),
      };
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + rejRes.msBeforeNext),
          retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
        };
      }
      throw rejRes;
    }
  }
}

// Rate limit guard
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private rateLimitService: RateLimitService,
    private reflector: Reflector,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const limitName = this.reflector.get<string>('rateLimit', context.getHandler());
    if (!limitName) return true;
    
    // Use user ID if authenticated, else IP
    const key = request.user?.sub || request.ip;
    
    const result = await this.rateLimitService.consume(limitName, key);
    
    // Set rate limit headers
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());
    
    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfter);
      throw new HttpException('Too Many Requests', 429);
    }
    
    return true;
  }
}
```

### 3.3 Sliding Window Rate Limiting

```typescript
// Sliding window implementation for precise rate limiting
async function slidingWindowRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const multi = redis.multi();
  
  // Remove old entries
  multi.zremrangebyscore(key, 0, windowStart);
  
  // Count current entries
  multi.zcard(key);
  
  // Add current request
  multi.zadd(key, now, `${now}:${Math.random()}`);
  
  // Set expiry
  multi.expire(key, Math.ceil(windowMs / 1000));
  
  const results = await multi.exec();
  const currentCount = results[1][1] as number;
  
  if (currentCount >= limit) {
    // Remove the request we just added (it was rejected)
    await redis.zrem(key, `${now}:${Math.random()}`);
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: limit - currentCount - 1 };
}
```

---

## 4. Abuse Prevention

### 4.1 Request Validation

```typescript
// apps/api/src/validation/sanitization.pipe.ts

import { PipeTransform, Injectable } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }
    
    return value;
  }
  
  private sanitizeString(str: string): string {
    // Remove HTML tags
    const cleaned = sanitizeHtml(str, {
      allowedTags: [],
      allowedAttributes: {},
    });
    
    // Trim and limit length
    return cleaned.trim().slice(0, 10000);
  }
  
  private sanitizeObject(obj: any): any {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.transform(value);
    }
    return result;
  }
}

// Content validation
export const ContentValidation = {
  // Check for spam patterns
  isSpam(text: string): boolean {
    const spamPatterns = [
      /\b(buy|sell|cheap|discount|offer|click here)\b/gi,
      /https?:\/\/[^\s]+/g,  // URLs (may be spam)
      /(.)\1{10,}/,  // Repeated characters
    ];
    
    for (const pattern of spamPatterns) {
      if (pattern.test(text)) return true;
    }
    
    return false;
  },
  
  // Check for profanity (basic)
  containsProfanity(text: string): boolean {
    // Use a proper profanity filter library
    const profanityFilter = new ProfanityFilter();
    return profanityFilter.isProfane(text);
  },
};
```

### 4.2 Account Protection

```typescript
// apps/api/src/auth/protection.service.ts

@Injectable()
export class AccountProtectionService {
  constructor(private redis: Redis) {}
  
  async recordLoginAttempt(email: string, success: boolean, ip: string): Promise<void> {
    const key = `login:attempts:${email}`;
    
    if (success) {
      await this.redis.del(key);
      return;
    }
    
    const attempts = await this.redis.incr(key);
    await this.redis.expire(key, 3600);  // 1 hour window
    
    if (attempts >= 5) {
      // Lock account temporarily
      await this.redis.setex(`account:locked:${email}`, 900, ip);  // 15 min
      
      // Notify user
      await this.notificationService.sendSecurityAlert(email, {
        type: 'account_locked',
        reason: 'Too many failed login attempts',
        ip,
      });
    }
  }
  
  async isAccountLocked(email: string): Promise<boolean> {
    return await this.redis.exists(`account:locked:${email}`) === 1;
  }
  
  async detectSuspiciousLogin(userId: string, context: LoginContext): Promise<boolean> {
    const recentLogins = await this.getRecentLogins(userId);
    
    // New device/location
    const knownDevices = new Set(recentLogins.map(l => l.deviceFingerprint));
    const knownLocations = new Set(recentLogins.map(l => l.country));
    
    const isNewDevice = !knownDevices.has(context.deviceFingerprint);
    const isNewLocation = !knownLocations.has(context.country);
    
    if (isNewDevice || isNewLocation) {
      await this.notificationService.sendSecurityAlert(userId, {
        type: 'new_login',
        device: context.device,
        location: `${context.city}, ${context.country}`,
        ip: context.ip,
      });
      
      return true;
    }
    
    return false;
  }
}
```

---

## 5. Content Moderation

### 5.1 Moderation Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MODERATION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Content ──▶ [Pre-Submit Validation] ──▶ [Queue]               │
│                          │                       │                   │
│                          │ Reject if obvious     │                   │
│                          │ violation             │                   │
│                          ▼                       ▼                   │
│                    ┌───────────┐         ┌───────────────────┐      │
│                    │  Blocked  │         │  Async Moderation │      │
│                    └───────────┘         └───────────────────┘      │
│                                                  │                   │
│                          ┌───────────────────────┴───────────────┐  │
│                          │                                       │  │
│                          ▼                                       ▼  │
│                   ┌─────────────┐                        ┌──────────┐│
│                   │  AI Review  │                        │ Human    ││
│                   │  (Auto-mod) │                        │ Queue    ││
│                   └─────────────┘                        └──────────┘│
│                          │                                       │  │
│               ┌──────────┴──────────┐                            │  │
│               │                     │                            │  │
│               ▼                     ▼                            ▼  │
│        ┌──────────┐          ┌──────────┐              ┌──────────┐ │
│        │ Approved │          │ Flagged  │              │ Decision │ │
│        │ (Publish)│          │ for Human│              │ Made     │ │
│        └──────────┘          └──────────┘              └──────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 AI-Based Content Moderation

```python
# services/generator/moderation.py

from dataclasses import dataclass
from enum import Enum
import openai

class ModerationCategory(Enum):
    SAFE = "safe"
    VIOLENCE = "violence"
    SEXUAL = "sexual"
    HATE = "hate"
    SELF_HARM = "self_harm"
    ILLEGAL = "illegal"
    SPAM = "spam"

@dataclass
class ModerationResult:
    is_safe: bool
    categories: list[ModerationCategory]
    confidence: float
    reason: str | None
    requires_human_review: bool

class ContentModerator:
    def __init__(self):
        self.client = openai.OpenAI()
    
    async def moderate_text(self, text: str) -> ModerationResult:
        """Moderate text content using OpenAI moderation API."""
        
        # Use OpenAI's moderation endpoint
        response = await self.client.moderations.create(input=text)
        result = response.results[0]
        
        flagged_categories = []
        
        if result.categories.violence or result.categories.violence_graphic:
            flagged_categories.append(ModerationCategory.VIOLENCE)
        
        if result.categories.sexual or result.categories.sexual_minors:
            flagged_categories.append(ModerationCategory.SEXUAL)
        
        if result.categories.hate or result.categories.hate_threatening:
            flagged_categories.append(ModerationCategory.HATE)
        
        if result.categories.self_harm:
            flagged_categories.append(ModerationCategory.SELF_HARM)
        
        is_safe = not result.flagged
        
        # Additional custom checks
        if self._contains_spam(text):
            flagged_categories.append(ModerationCategory.SPAM)
            is_safe = False
        
        # Determine if human review needed
        confidence = max(result.category_scores.__dict__.values())
        requires_human = 0.3 < confidence < 0.9 and not is_safe
        
        return ModerationResult(
            is_safe=is_safe,
            categories=flagged_categories,
            confidence=confidence,
            reason=self._generate_reason(flagged_categories),
            requires_human_review=requires_human,
        )
    
    async def moderate_video(self, video_url: str) -> ModerationResult:
        """Moderate video content using frame analysis."""
        
        # Extract key frames
        frames = await self._extract_key_frames(video_url)
        
        # Analyze each frame
        results = []
        for frame in frames:
            result = await self._analyze_frame(frame)
            results.append(result)
        
        # Aggregate results
        is_safe = all(r.is_safe for r in results)
        all_categories = set()
        for r in results:
            all_categories.update(r.categories)
        
        max_confidence = max(r.confidence for r in results)
        
        return ModerationResult(
            is_safe=is_safe,
            categories=list(all_categories),
            confidence=max_confidence,
            reason="Video contains flagged frames" if not is_safe else None,
            requires_human_review=not is_safe and max_confidence < 0.9,
        )
    
    def _contains_spam(self, text: str) -> bool:
        """Check for spam patterns."""
        spam_indicators = [
            len(re.findall(r'https?://', text)) > 3,
            len(set(text.split())) < len(text.split()) * 0.3,  # Repetitive
            re.search(r'(.)\1{5,}', text),  # Repeated chars
        ]
        return any(spam_indicators)
```

### 5.3 Moderation Queue Management

```typescript
// apps/api/src/moderation/moderation.service.ts

@Injectable()
export class ModerationService {
  constructor(
    private db: PrismaService,
    private notifications: NotificationService,
  ) {}
  
  async submitForReview(contentId: string, type: ContentType, reason: string): Promise<void> {
    await this.db.moderationFlags.create({
      data: {
        contentId,
        contentType: type,
        reason,
        status: 'pending',
        priority: this.calculatePriority(reason),
      },
    });
    
    // Notify moderators
    await this.notifications.notifyModerators({
      type: 'new_flag',
      contentId,
      reason,
    });
  }
  
  async getQueue(filters: ModerationFilters): Promise<PaginatedFlags> {
    return this.db.moderationFlags.findMany({
      where: {
        status: filters.status || 'pending',
        priority: filters.priority,
        contentType: filters.contentType,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 50,
      skip: filters.offset || 0,
      include: {
        content: true,
        reporter: { select: { id: true, username: true } },
      },
    });
  }
  
  async resolveFlag(
    flagId: string,
    decision: ModerationDecision,
    moderatorId: string
  ): Promise<void> {
    const flag = await this.db.moderationFlags.update({
      where: { id: flagId },
      data: {
        status: decision.action,
        resolvedAt: new Date(),
        moderatorId,
        resolution: decision.reason,
      },
      include: { content: true },
    });
    
    // Apply action
    switch (decision.action) {
      case 'remove':
        await this.removeContent(flag.contentId, flag.contentType);
        break;
      
      case 'warn':
        await this.warnUser(flag.content.userId, decision.reason);
        break;
      
      case 'ban':
        await this.banUser(flag.content.userId, decision.duration);
        break;
    }
    
    // Log for audit
    await this.db.moderationLogs.create({
      data: {
        flagId,
        moderatorId,
        action: decision.action,
        reason: decision.reason,
      },
    });
  }
  
  private calculatePriority(reason: string): number {
    // Higher priority for certain categories
    if (reason.includes('violence') || reason.includes('hate')) return 10;
    if (reason.includes('sexual')) return 8;
    if (reason.includes('spam')) return 3;
    return 5;
  }
}
```

---

## 6. Audit Logging

### 6.1 Audit Log Schema

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Who
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- What
    action VARCHAR(100) NOT NULL,  -- e.g., 'scene.create', 'user.login'
    resource_type VARCHAR(50),
    resource_id UUID,
    
    -- Context
    details JSONB,  -- Additional action-specific data
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
```

### 6.2 Audit Logger

```typescript
// apps/api/src/audit/audit.service.ts

@Injectable()
export class AuditService {
  constructor(
    private db: PrismaService,
    @Inject('KAFKA') private kafka: KafkaProducer,
  ) {}
  
  async log(entry: AuditEntry): Promise<void> {
    // Write to database
    await this.db.auditLogs.create({
      data: {
        userId: entry.userId,
        ipAddress: entry.ip,
        userAgent: entry.userAgent,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details,
        success: entry.success,
        errorMessage: entry.error,
      },
    });
    
    // Also publish to Kafka for real-time monitoring
    await this.kafka.send('audit-events', {
      key: entry.userId || 'anonymous',
      value: JSON.stringify(entry),
    });
  }
}

// Audit interceptor
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}
  
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    
    const auditAction = this.reflector.get<string>('audit', handler);
    if (!auditAction) {
      return next.handle();
    }
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap({
        next: (response) => {
          this.auditService.log({
            userId: request.user?.sub,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            action: auditAction,
            resourceType: this.getResourceType(handler),
            resourceId: request.params.id || response?.id,
            details: { duration: Date.now() - startTime },
            success: true,
          });
        },
        error: (error) => {
          this.auditService.log({
            userId: request.user?.sub,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            action: auditAction,
            resourceType: this.getResourceType(handler),
            resourceId: request.params.id,
            success: false,
            error: error.message,
          });
        },
      })
    );
  }
}
```

---

## 7. Security Headers & Best Practices

### 7.1 Security Headers

```typescript
// apps/api/src/main.ts

import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://cdn.storyforge.io'],
      mediaSrc: ["'self'", 'https://cdn.storyforge.io'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.storyforge.io', 'wss://ws.storyforge.io'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));

// CORS configuration
app.enableCors({
  origin: [
    'https://storyforge.io',
    'https://www.storyforge.io',
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
});
```

### 7.2 Input Validation

```typescript
// Strict validation with class-validator
import { IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateSceneDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/^[\w\s\-.,!?'"]+$/i, {
    message: 'Title contains invalid characters',
  })
  title: string;
  
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;
  
  @IsUUID('4')
  topicId: string;
  
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;
}

// Global validation pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,  // Strip unknown properties
  forbidNonWhitelisted: true,  // Throw on unknown properties
  transform: true,  // Transform to DTO class
  transformOptions: {
    enableImplicitConversion: false,  // Require explicit types
  },
  validationError: {
    target: false,  // Don't expose input value in errors
    value: false,
  },
}));
```
