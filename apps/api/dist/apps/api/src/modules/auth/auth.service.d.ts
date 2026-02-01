import { JwtService } from '@nestjs/jwt';
import { FirestoreService } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
import { LoginDto, SignupDto } from './dto';
export declare class AuthService {
    private firestore;
    private jwt;
    private redis;
    constructor(firestore: FirestoreService, jwt: JwtService, redis: RedisService);
    signup(dto: SignupDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    logout(userId: string): Promise<{
        success: boolean;
    }>;
    getUser(userId: string): Promise<{
        id: string;
        email: string;
        username: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
        role: string;
        createdAt: Date;
    }>;
    private generateTokens;
    private hashPassword;
    private verifyPassword;
}
