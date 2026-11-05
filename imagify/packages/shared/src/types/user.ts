// User types

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  CREATOR = 'creator',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'> {
  sceneCount: number;
  segmentCount: number;
  followerCount: number;
  followingCount: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti: string;
}
