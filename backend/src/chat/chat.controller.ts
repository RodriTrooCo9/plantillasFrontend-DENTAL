import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { ChatService } from "./chat.service";
import { AuthService } from "../auth/auth.service";
import { extractBearer, extractRefreshCookie } from "../common/auth.guard";
import { ChatRequestDto } from "./dto/chat.dto";
import type { UserResponseDto } from "../auth/dto/auth.dto";

@ApiTags("Asistente Clínico (Chat)")
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Enviar mensaje o confirmar acción clínica mediante token opaco",
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
