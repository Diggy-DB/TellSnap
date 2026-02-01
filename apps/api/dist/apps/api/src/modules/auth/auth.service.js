"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const firestore_service_1 = require("../../firestore/firestore.service");
const redis_service_1 = require("../../redis/redis.service");
const crypto = __importStar(require("crypto"));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (UserRole = {}));
let AuthService = class AuthService {
    firestore;
    jwt;
    redis;
    constructor(firestore, jwt, redis) {
        this.firestore = firestore;
        this.jwt = jwt;
        this.redis = redis;
    }
    async signup(dto) {
        const existingByEmail = await this.firestore.findMany('users', {
            where: [{ field: 'email', op: '==', value: dto.email }],
            limit: 1,
        });
        if (existingByEmail.length > 0) {
            throw new common_1.ConflictException('Email already registered');
        }
        const existingByUsername = await this.firestore.findMany('users', {
            where: [{ field: 'username', op: '==', value: dto.username }],
            limit: 1,
        });
        if (existingByUsername.length > 0) {
            throw new common_1.ConflictException('Username already taken');
        }
        const passwordHash = await this.hashPassword(dto.password);
        const userId = await this.firestore.create('users', {
            email: dto.email,
            username: dto.username,
            passwordHash,
            role: UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const user = await this.firestore.findById('users', userId);
        return this.generateTokens(user);
    }
    async login(dto) {
        const users = await this.firestore.findMany('users', {
            where: [{ field: 'email', op: '==', value: dto.email }],
            limit: 1,
        });
        const user = users[0];
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await this.verifyPassword(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return this.generateTokens(user);
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            const isRevoked = await this.redis.exists(`revoked:${payload.jti}`);
            if (isRevoked) {
                throw new common_1.UnauthorizedException('Token revoked');
            }
            const user = await this.firestore.findById('users', payload.sub);
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async logout(userId) {
        await this.redis.set(`logout:${userId}`, Date.now(), 7 * 24 * 60 * 60);
        return { success: true };
    }
    async getUser(userId) {
        const user = await this.firestore.findById('users', userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
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
    async generateTokens(user) {
        const jti = crypto.randomUUID();
        const accessToken = this.jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            jti,
        }, { expiresIn: '15m' });
        const refreshToken = this.jwt.sign({ sub: user.id, jti }, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });
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
    async hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }
    async verifyPassword(password, stored) {
        const [salt, hash] = stored.split(':');
        const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return hash === verify;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        jwt_1.JwtService,
        redis_service_1.RedisService])
], AuthService);
//# sourceMappingURL=auth.service.js.map