import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CustomerJwtPayload } from './interfaces/customer-jwt-payload.interface';
import { RegisterCustomerDto } from './dto/register-customer.dto';

interface DeviceContext {
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 jours — session grand public plus longue que le staff (7j)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    return this.prisma.customer.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        marketingOptIn: dto.marketingOptIn ?? false,
      },
      select: { id: true, email: true, fullName: true, phone: true, marketingOptIn: true, createdAt: true },
    });
  }

  /** Utilisé par CustomerLocalStrategy. */
  async validateCredentials(email: string, password: string) {
    const customer = await this.prisma.customer.findUnique({ where: { email } });

    if (!customer || !customer.isActive) {
      return null;
    }

    if (customer.lockedUntil && customer.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Compte verrouillé jusqu'à ${customer.lockedUntil.toISOString()} suite à trop de tentatives échouées`,
      );
    }

    const passwordValid = await argon2.verify(customer.passwordHash, password);

    if (!passwordValid) {
      await this.registerFailedAttempt(customer.id, customer.failedLoginAttempts);
      return null;
    }

    if (customer.failedLoginAttempts > 0) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return customer;
  }

  private async registerFailedAttempt(customerId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000) : null,
      },
    });
  }

  async login(customerId: string, context: DeviceContext): Promise<TokenPair> {
    const sessionId = crypto.randomUUID();
    const refreshToken = this.signRefreshToken(customerId, sessionId);
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.customerSession.create({
      data: {
        id: sessionId,
        customerId,
        refreshTokenHash,
        deviceInfo: { userAgent: context.userAgent ?? null },
        ipAddress: context.ipAddress,
        expiresAt,
      },
    });

    try {
      await this.redis.set(
        `customer-session:${sessionId}:refresh_hash`,
        refreshTokenHash,
        'EX',
        REFRESH_TOKEN_TTL_SECONDS,
      );
    } catch {
      // Redis unavailable
    }

    await this.prisma.customer.update({ where: { id: customerId }, data: { lastLoginAt: new Date() } });

    const accessToken = await this.issueAccessToken(customerId, sessionId);
    return { accessToken, refreshToken, sessionId, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  async refresh(customerId: string, sessionId: string): Promise<TokenPair> {
    const session = await this.prisma.customerSession.findUniqueOrThrow({ where: { id: sessionId } });

    if (session.revokedAt) {
      throw new UnauthorizedException('Session révoquée');
    }

    const newRefreshToken = this.signRefreshToken(customerId, sessionId);
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.customerSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash: newRefreshTokenHash, expiresAt: newExpiresAt, lastActivityAt: new Date() },
    });

    try {
      await this.redis.set(
        `customer-session:${sessionId}:refresh_hash`,
        newRefreshTokenHash,
        'EX',
        REFRESH_TOKEN_TTL_SECONDS,
      );
    } catch {
      // Redis unavailable
    }

    const accessToken = await this.issueAccessToken(customerId, sessionId);
    return { accessToken, refreshToken: newRefreshToken, sessionId, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.customerSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    try {
      await this.redis.del(`customer-session:${sessionId}:refresh_hash`);
      await this.redis.set(`customer-session:${sessionId}:revoked`, '1', 'EX', ACCESS_TOKEN_TTL_SECONDS);
    } catch {
      // Redis unavailable
    }
  }

  async getProfile(customerId: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { id: true, email: true, fullName: true, phone: true, marketingOptIn: true, createdAt: true },
    });
  }

  private signRefreshToken(customerId: string, sessionId: string): string {
    return this.jwtService.sign(
      { sub: customerId, sid: sessionId, jti: crypto.randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_CUSTOMER_REFRESH_SECRET'),
        algorithm: 'HS256',
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      },
    );
  }

  private async issueAccessToken(customerId: string, sessionId: string): Promise<string> {
    const payload: Omit<CustomerJwtPayload, 'iat' | 'exp'> = {
      sub: customerId,
      type: 'customer',
      sid: sessionId,
      jti: crypto.randomUUID(),
    };

    return this.jwtService.sign(payload, {
      privateKey: Buffer.from(this.configService.getOrThrow<string>('JWT_PRIVATE_KEY'), 'base64').toString('utf8'),
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
