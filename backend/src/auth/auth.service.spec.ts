import { HttpException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService, hashPassword, verifyPassword } from "./auth.service";
import { resolveJwtSecret } from "./auth.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Servicio de Autenticación y Seguridad de Sesiones (AuthService)", () => {
  const createMockDependencies = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as PrismaService;

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed.jwt.token"),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    return { prisma, jwtService, service: new AuthService(prisma, jwtService) };
  };

  it("almacena contraseñas con hash scrypt y salt aleatorio único por cada invocación", () => {
    // Arrange
    const password = "MiPasswordClinico2026!";

    // Act
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    // Assert
    expect(hash1).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash1).not.toEqual(hash2); // Salt aleatorio produce hashes distintos
    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword(password, hash2)).toBe(true);
    expect(verifyPassword("PasswordIncorrecto", hash1)).toBe(false);
  });

  it("autentica exitosamente a un dentista admin y guarda el refresh token hasheado", async () => {
    // Arrange
    const { prisma, service } = createMockDependencies();
    const storedUser = {
      id: "usr-admin",
      email: "admin@demo.com",
      passwordHash: hashPassword("123456"),
      nombreCompleto: "Dr. Admin Principal",
      rol: "DENTISTA",
      pacienteId: null,
      dentistaId: "den-admin",
      avatarUrl: null,
      createdAt: new Date(),
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(storedUser);
    (prisma.session.create as jest.Mock).mockResolvedValue({
      id: "sess-1",
      userId: "usr-admin",
      refreshToken: "hashed",
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    });

    // Act
    const result = await service.login({
      email: "admin@demo.com",
      password: "123456",
    });

    // Assert
    expect(result.auth.access_token).toBe("signed.jwt.token");
    expect(result.auth.user.rol).toBe("DENTISTA");
    expect(result.auth.user.dentista_id).toBe("den-admin");
    expect(result.refreshToken).toBeDefined();
    const createCallArg = (prisma.session.create as jest.Mock).mock.calls[0][0];
    expect(createCallArg.data.refreshToken).not.toBe(result.refreshToken);
  });

  it("bloquea por fuerza bruta (429 Too Many Requests) tras 5 intentos fallidos consecutivos", async () => {
    // Arrange
    const { prisma, service } = createMockDependencies();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    // Act
    for (let i = 0; i < 5; i++) {
      await expect(
        service.login({ email: "ataque@demo.com", password: `wrong-${i}` }),
      ).rejects.toThrow(UnauthorizedException);
    }

    // Assert
    await expect(
      service.login({ email: "ataque@demo.com", password: "wrong-6" }),
    ).rejects.toThrow(HttpException);

    try {
      await service.login({ email: "ataque@demo.com", password: "wrong-6" });
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(429);
    }
  });

  it("rota el refresh token al renovar sesión e invalida el token anterior contra ataques de replay", async () => {
    // Arrange
    const { prisma, service } = createMockDependencies();
    const activeSession = {
      id: "sess-rot",
      userId: "usr-prueba1",
      refreshToken: "old-hash",
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      user: {
        id: "usr-prueba1",
        email: "prueba1@demo.com",
        passwordHash: "hash",
        nombreCompleto: "Usuario Prueba 1",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
        dentistaId: null,
        avatarUrl: null,
        createdAt: new Date(),
      },
    };
    (prisma.session.findUnique as jest.Mock).mockResolvedValueOnce(activeSession);
    (prisma.session.update as jest.Mock).mockResolvedValue({});

    // Act
    const refreshed = await service.refresh("raw-token-original");

    // Assert
    expect(refreshed.refreshToken).not.toBe("raw-token-original");
    expect(prisma.session.update).toHaveBeenCalledTimes(1);
  });

  it("valida usuario por Bearer token o cookie, cierra sesión y procesa recuperación de contraseña", async () => {
    // Arrange
    const { prisma, jwtService, service } = createMockDependencies();
    const activeSession = {
      id: "sess-1",
      userId: "usr-admin",
      refreshToken: "hash",
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      user: {
        id: "usr-admin",
        email: "admin@demo.com",
        passwordHash: "hash",
        nombreCompleto: "Dr. Admin Principal",
        rol: "DENTISTA",
        pacienteId: null,
        dentistaId: "den-admin",
        avatarUrl: null,
        createdAt: new Date(),
      },
    };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "usr-admin",
      sessionId: "sess-1",
      rol: "DENTISTA",
    });
    (prisma.session.findUnique as jest.Mock).mockResolvedValue(activeSession);
    (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    // Act
    const userFromBearer = await service.validateRequestUser("valid.bearer");
    await service.logout("cookie-tok", "valid.bearer");
    const forgotRes = await service.forgotPassword("admin@demo.com");
    service.resetRateLimits();

    // Assert
    expect(userFromBearer.id).toBe("usr-admin");
    expect(prisma.session.updateMany).toHaveBeenCalled();
    expect(forgotRes.message).toContain("admin@demo.com");
    await expect(service.forgotPassword("invalido")).rejects.toThrow();
  });

  it("rechaza con error crítico si NODE_ENV=production no define un JWT_SECRET propio", () => {
    // Arrange
    const prodEnvSinSecreto = { NODE_ENV: "production" } as NodeJS.ProcessEnv;

    // Act & Assert
    expect(() => resolveJwtSecret(prodEnvSinSecreto)).toThrow(
      /JWT_SECRET debe estar definido/,
    );
  });
});
