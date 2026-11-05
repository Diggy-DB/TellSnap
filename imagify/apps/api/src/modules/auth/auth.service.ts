import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirestoreService, User } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
import { LoginDto, SignupDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import * as crypto from 'crypto';

// Define UserRole locally since we're not using Prisma
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private firestore: FirestoreService,
    private jwt: JwtService,
    private redis: RedisService,
  ) {}

  async signup(dto: SignupDto) {
    // Check if email already exists
    const existingByEmail = await this.firestore.findMany<User>('users', {
      where: [{ field: 'email', op: '==', value: dto.email }],
      limit: 1,
    });

    if (existingByEmail.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Check if username exists
    const existingByUsername = await this.firestore.findMany<User>('users', {
      where: [{ field: 'username', op: '==', value: dto.username }],
      limit: 1,
    });

    if (existingByUsername.length > 0) {
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Create user
    const userId = await this.firestore.create<User>('users', {
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await this.firestore.findById<User>('users', userId);

    // Generate tokens
    return this.generateTokens(user!);
  }

  async login(dto: LoginDto) {
    const users = await this.firestore.findMany<User>('users', {
      where: [{ field: 'email', op: '==', value: dto.email }],
      limit: 1,
    });

    const user = users[0];

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.verifyPassword(dto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if token is revoked
      const isRevoked = await this.redis.exists(`revoked:${payload.jti}`);
      if (isRevoked) {
        throw new UnauthorizedException('Token revoked');
      }

      const user = await this.firestore.findById<User>('users', payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for user
    await this.redis.set(`logout:${userId}`, Date.now(), 7 * 24 * 60 * 60);
    return { success: true };
  }

  async getUser(userId: string) {
    const user = await this.firestore.findById<User>('users', userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(user: { id: string; email: string; role: string }) {
    const jti = crypto.randomUUID();

    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti,
      },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwt.sign(
      { sub: user.id, jti },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 15 * 60 * 1000,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verify;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const users = await this.firestore.findMany<User>('users', {
      where: [{ field: 'email', op: '==', value: dto.email }],
      limit: 1,
    });

    const user = users[0];

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${dto.email}`);
      return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token in Redis with 1 hour expiry
    await this.redis.set(`reset:${resetTokenHash}`, user.id, 60 * 60);

    // In production, send email here. For now, log it.
    const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    this.logger.log(`Password reset link for ${dto.email}: ${resetUrl}`);

    // TODO: Integrate with email service (SendGrid, etc.)
    // await this.emailService.sendPasswordReset(user.email, resetUrl);

    return { 
      success: true, 
      message: 'If an account exists with this email, a reset link has been sent.',
      // Include token in dev mode for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken, resetUrl }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    
    const userId = await this.redis.get(`reset:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.firestore.findById<User>('users', userId as string);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(dto.newPassword);

    // Update user password
    await this.firestore.update('users', user.id, {
      passwordHash,
      updatedAt: new Date(),
    });

    // Delete reset token
    await this.redis.del(`reset:${tokenHash}`);

    this.logger.log(`Password reset successful for user: ${user.id}`);

    return { success: true, message: 'Password has been reset successfully' };
  }
}
