import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthService, SESSION_COOKIE_NAME } from "./auth.service";
import {
  AuthResponseDto,
  ForgotPasswordDto,
  LoginDto,
  UserResponseDto,
} from "./dto/auth.dto";
import {
  CurrentUser,
  extractBearer,
  extractRefreshCookie,
  JwtAuthGuard,
} from "../common/auth.guard";

@ApiTags("Autenticación")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesión por rol (PACIENTE / DENTISTA)" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { auth, refreshToken, maxAgeSeconds } =
      await this.authService.login(dto);
    res.cookie(SESSION_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSeconds * 1000,
    });
    return auth;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar access_token mediante cookie HttpOnly" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const cookie = extractRefreshCookie(req);
    const { auth, refreshToken, maxAgeSeconds } =
      await this.authService.refresh(cookie);
    res.cookie(SESSION_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSeconds * 1000,
    });
    return auth;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener identidad y rol de la sesión activa" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(@CurrentUser() user: UserResponseDto): UserResponseDto {
    return user;
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Solicitar instrucciones de recuperación" })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revocar sesión activa y limpiar cookie" })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const cookie = extractRefreshCookie(req);
    const bearer = extractBearer(req);
    await this.authService.logout(cookie, bearer);
    res.cookie(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
    return { ok: true };
  }
}
