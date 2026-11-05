// Segment types

export interface Segment {
  id: string;
  sceneId: string;
  userId: string;
  parentId: string | null;
  sequence: number;
  prompt: string;
  expandedScript: string | null;
  videoUrl: string | null;
  hlsUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  status: SegmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum SegmentStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface SegmentWithCreator extends Segment {
  creator: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface PlaylistSegment {
  id: string;
  sequence: number;
  hlsUrl: string;
  duration: number;
  thumbnailUrl: string | null;
}

export interface ScenePlaylist {
  sceneId: string;
  totalDuration: number;
  segments: PlaylistSegment[];
}
