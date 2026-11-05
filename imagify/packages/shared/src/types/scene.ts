// Scene types

export enum SceneStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  topicId: string;
  categoryId: string | null;
  userId: string;
  status: SceneStatus;
  segmentCount: number;
  totalDuration: number;
  likeCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SceneWithRelations extends Scene {
  topic: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  creator: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface CreateSceneInput {
  title: string;
  description: string;
  topicId: string;
  categoryId?: string;
  initialPrompt: string;
}

export interface ContinueSceneInput {
  sceneId: string;
  parentSegmentId: string;
  prompt: string;
}
