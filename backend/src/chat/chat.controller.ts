import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ChatService } from "./chat.service";
import { AuthService } from "../auth/auth.service";
import { extractBearer, extractRefreshCookie } from "../common/auth.guard";
import { ChatRequestDto, ChatStreamRequestDto } from "./dto/chat.dto";
import type { UserResponseDto } from "../auth/dto/auth.dto";

@ApiTags("Asistente Clínico Inteligente (Chat)")
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  @Get("health")
  @ApiOperation({
    summary:
      "Health check en tiempo real de endpoints, base de datos y motor Ollama",
  })
  async getHealth() {
    return this.chatService.obtenerEstadoSistema();
  }

  @Post("stream")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Streaming SSE compatible con Vercel AI SDK useChat y Tool Calling de Ollama",
  })
  async streamChat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: ChatStreamRequestDto,
  ) {
    let user: UserResponseDto | null = null;
    const bearer = extractBearer(req);
    const cookie = extractRefreshCookie(req);
    if (bearer || cookie) {
      try {
        user = await this.authService.validateRequestUser(bearer, cookie);
      } catch {
        user = null;
      }
    }
    return this.chatService.streamChat(res, body, user);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Enviar mensaje o confirmar acción clínica mediante token opaco (Legacy)",
  })
  async sendMessage(@Req() req: Request, @Body() dto: ChatRequestDto) {
    let user: UserResponseDto | null = null;
    const bearer = extractBearer(req);
    const cookie = extractRefreshCookie(req);
    if (bearer || cookie) {
      try {
        user = await this.authService.validateRequestUser(bearer, cookie);
      } catch {
        user = null;
      }
    }
    return this.chatService.processChat(user, dto);
  }
}
