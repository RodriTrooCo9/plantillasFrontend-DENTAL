import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null) {
        const body = res as Record<string, unknown>;
        response.status(status).json({
          message: body.message || exception.message,
          ...(body.code ? { code: body.code } : {}),
        });
        return;
      }
      response.status(status).json({ message: String(res) });
      return;
    }

    const message =
      exception instanceof Error
        ? exception.message
        : "Error interno del servidor.";
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message,
      code: "INTERNAL_ERROR",
    });
  }
}
