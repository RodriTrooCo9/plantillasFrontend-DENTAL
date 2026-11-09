import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "../common/auth.guard";

const DEFAULT_FALLBACK_SECRET = "lumina-dental-super-secret-jwt-key-2026";

export function resolveJwtSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secret = env.JWT_SECRET;
  if (
    env.NODE_ENV === "production" &&
    (!secret || secret === DEFAULT_FALLBACK_SECRET)
  ) {
    throw new Error(
      "Configuración crítica: JWT_SECRET debe estar definido y ser único en producción.",
    );
  }
  return secret || DEFAULT_FALLBACK_SECRET;
}

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: {
        expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS || 3600),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
