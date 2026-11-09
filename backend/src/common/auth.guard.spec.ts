import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "../auth/auth.service";

describe("Guard de Autenticación JWT y Cookies (JwtAuthGuard)", () => {
  it("autoriza la petición e inyecta req.user cuando el token Bearer o cookie es válido", async () => {
    // Arrange
    const mockUser = {
      id: "usr-admin",
      email: "admin@demo.com",
      nombre_completo: "Dr. Admin Principal",
      rol: "DENTISTA" as const,
      paciente_id: null,
      dentista_id: "den-admin",
      avatar_url: null,
    };
    const mockAuthService = {
      validateRequestUser: jest.fn().mockResolvedValue(mockUser),
    } as unknown as AuthService;
    const guard = new JwtAuthGuard(mockAuthService);
    const req: Record<string, unknown> = {
      headers: { authorization: "Bearer valid.jwt.token" },
      cookies: {},
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    // Act
    const allowed = await guard.canActivate(context);

    // Assert
    expect(allowed).toBe(true);
    expect(req.user).toEqual(mockUser);
    expect(mockAuthService.validateRequestUser).toHaveBeenCalledWith(
      "valid.jwt.token",
      undefined,
    );
  });

  it("rechaza con 401 Unauthorized cuando no hay sesión ni token válido", async () => {
    // Arrange
    const mockAuthService = {
      validateRequestUser: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException("Sesión expirada")),
    } as unknown as AuthService;
    const guard = new JwtAuthGuard(mockAuthService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, cookies: {} }),
      }),
    } as unknown as ExecutionContext;

    // Act & Assert
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
