import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "node:crypto";
import {
  LoginDto,
  UserResponseDto,
  AuthResponseDto,
} from "./dto/auth.dto";
import type { User } from "@prisma/client";
import { hashPassword, verifyPassword, hashToken } from "./password.util";

export { hashPassword, verifyPassword, hashToken };
export const SESSION_COOKIE_NAME = "lumina_refresh";

export interface JwtPayload {
  sub: string;
  sessionId: string;
  rol: "PACIENTE" | "DENTISTA";
  pacienteId?: string | null;
  dentistaId?: string | null;
  nombreCompleto: string;
}

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class AuthService {
  private readonly expiresInSeconds = Number(
    process.env.JWT_EXPIRES_IN_SECONDS || 3600,
  );
  private readonly refreshTtlDays = Number(
    process.env.REFRESH_TOKEN_TTL_DAYS || 7,
  );
  private readonly maxFailedAttempts = 5;
  private readonly windowMs = 60_000;
  private readonly failedAttempts = new Map<string, RateLimitBucket>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  resetRateLimits(): void {
    this.failedAttempts.clear();
  }

  private checkRateLimit(key: string, now = Date.now()): void {
    const bucket = this.failedAttempts.get(key);
    if (!bucket) return;
    if (now - bucket.windowStart > this.windowMs) {
      this.failedAttempts.delete(key);
      return;
    }
    if (bucket.count >= this.maxFailedAttempts) {
      throw new HttpException(
        {
          message:
            "Demasiados intentos fallidos de inicio de sesión. Por seguridad, espera un minuto antes de reintentar.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedAttempt(key: string, now = Date.now()): void {
    const bucket = this.failedAttempts.get(key);
    if (!bucket || now - bucket.windowStart > this.windowMs) {
      this.failedAttempts.set(key, { count: 1, windowStart: now });
      return;
    }
    bucket.count += 1;
  }

  mapUserToDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      nombre_completo: user.nombreCompleto,
      rol: user.rol as "PACIENTE" | "DENTISTA",
      paciente_id: user.pacienteId ?? null,
      dentista_id: user.dentistaId ?? null,
      avatar_url: user.avatarUrl ?? null,
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{
    auth: AuthResponseDto;
    refreshToken: string;
    maxAgeSeconds: number;
  }> {
    const email = dto.email.trim().toLowerCase();
    this.checkRateLimit(email);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(dto.password.trim(), user.passwordHash)) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedException("Correo o contraseña incorrectos.");
    }

    this.failedAttempts.delete(email);

    const refreshToken = randomUUID();
    const refreshTokenHash = hashToken(refreshToken);
    const maxAgeSeconds = this.refreshTtlDays * 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenHash,
        expiresAt,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      sessionId: session.id,
      rol: user.rol as "PACIENTE" | "DENTISTA",
      pacienteId: user.pacienteId,
      dentistaId: user.dentistaId,
      nombreCompleto: user.nombreCompleto,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.expiresInSeconds,
    });

    return {
      auth: {
        access_token: accessToken,
        expires_in: this.expiresInSeconds,
        user: this.mapUserToDto(user),
      },
      refreshToken,
      maxAgeSeconds,
    };
  }

  async refresh(
    refreshToken?: string,
  ): Promise<{
    auth: AuthResponseDto;
    refreshToken: string;
    maxAgeSeconds: number;
  }> {
    if (!refreshToken) {
      throw new UnauthorizedException("Sesión ausente o expirada.");
    }

    const tokenHash = hashToken(refreshToken);
    let session = await this.prisma.session.findUnique({
      where: { refreshToken: tokenHash },
      include: { user: true },
    });
    if (!session) {
      session = await this.prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });
    }

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("Sesión inválida o expirada.");
    }

    // Rotate refresh token to prevent replay attacks
    const rotatedRefreshToken = randomUUID();
    const rotatedTokenHash = hashToken(rotatedRefreshToken);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: rotatedTokenHash },
    });

    const user = session.user;
    const payload: JwtPayload = {
      sub: user.id,
      sessionId: session.id,
      rol: user.rol as "PACIENTE" | "DENTISTA",
      pacienteId: user.pacienteId,
      dentistaId: user.dentistaId,
      nombreCompleto: user.nombreCompleto,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.expiresInSeconds,
    });
    const maxAgeSeconds = Math.max(
      60,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      auth: {
        access_token: accessToken,
        expires_in: this.expiresInSeconds,
        user: this.mapUserToDto(user),
      },
      refreshToken: rotatedRefreshToken,
      maxAgeSeconds,
    };
  }

  async validateRequestUser(
    bearerToken?: string,
    refreshCookie?: string,
  ): Promise<UserResponseDto> {
    if (bearerToken) {
      try {
        const decoded = await this.jwtService.verifyAsync<JwtPayload>(
          bearerToken,
        );
        const session = await this.prisma.session.findUnique({
          where: { id: decoded.sessionId },
          include: { user: true },
        });
        if (
          session &&
          session.revokedAt === null &&
          session.expiresAt.getTime() > Date.now()
        ) {
          return this.mapUserToDto(session.user);
        }
      } catch {
        // Fallback a cookie si existe o lanzar 401 abajo
      }
    }

    if (refreshCookie) {
      const tokenHash = hashToken(refreshCookie);
      let session = await this.prisma.session.findUnique({
        where: { refreshToken: tokenHash },
        include: { user: true },
      });
      if (!session) {
        session = await this.prisma.session.findUnique({
          where: { refreshToken: refreshCookie },
          include: { user: true },
        });
      }
      if (
        session &&
        session.revokedAt === null &&
        session.expiresAt.getTime() > Date.now()
      ) {
        return this.mapUserToDto(session.user);
      }
    }

    throw new UnauthorizedException("Sesión no autorizada o expirada.");
  }

  async logout(refreshCookie?: string, bearerToken?: string): Promise<void> {
    if (refreshCookie) {
      const tokenHash = hashToken(refreshCookie);
      await this.prisma.session.updateMany({
        where: {
          OR: [{ refreshToken: tokenHash }, { refreshToken: refreshCookie }],
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    if (bearerToken) {
      try {
        const decoded = await this.jwtService.verifyAsync<JwtPayload>(
          bearerToken,
        );
        await this.prisma.session.updateMany({
          where: { id: decoded.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Ignorar token ya expirado al cerrar sesión
      }
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const clean = email.trim();
    if (!clean || !clean.includes("@")) {
      throw new BadRequestException(
        "Ingresa un correo electrónico registrado válido.",
      );
    }
    return {
      message: `Se enviaron las instrucciones de recuperación de contraseña a ${clean}.`,
    };
  }
}
