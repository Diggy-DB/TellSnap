// API client for StoryForge

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message || 'Request failed', error);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, username: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });
  }

  async getMe() {
    return this.request<{ id: string; email: string; username: string; role: string }>('/auth/me');
  }

  // Topics
  async getTopics() {
    return this.request<{ items: Topic[] }>('/topics');
  }

  async getTopic(id: string) {
    return this.request<Topic>(`/topics/${id}`);
  }

  // Scenes
  async getScenes(params?: { topicId?: string; page?: number; limit?: number }) {
    return this.request<{ items: Scene[]; meta: PaginationMeta }>('/scenes', { params });
  }

  async getScene(id: string) {
    return this.request<Scene>(`/scenes/${id}`);
  }

  async createScene(data: CreateSceneInput) {
    return this.request<{ scene: Scene; job: Job }>('/scenes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async continueScene(sceneId: string, data: ContinueSceneInput) {
    return this.request<{ segment: Segment; job: Job }>(`/scenes/${sceneId}/continue`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getScenePlaylist(id: string) {
    return this.request<ScenePlaylist>(`/scenes/${id}/playlist`);
  }

  // Jobs
  async getJob(id: string) {
    return this.request<Job>(`/jobs/${id}`);
  }
}

export class ApiError extends Error {
  status: number;
  details: Record<string, unknown>;

  constructor(status: number, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'ApiError';
  }
}

// Types (simplified versions, full types in @storyforge/shared)
interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  sceneCount: number;
}

interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  segmentCount: number;
  likeCount: number;
  createdAt: string;
}

interface Segment {
  id: string;
  sceneId: string;
  sequence: number;
  status: string;
}

interface Job {
  id: string;
  status: string;
  progress: number;
}

interface ScenePlaylist {
  sceneId: string;
  totalDuration: number;
  segments: { id: string; hlsUrl: string; duration: number }[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface CreateSceneInput {
  title: string;
  description: string;
  topicId: string;
  initialPrompt: string;
}

interface ContinueSceneInput {
  parentSegmentId: string;
  prompt: string;
}

export const api = new ApiClient(API_BASE);
