import { repositories } from "@/data/factory";
import type { ContextoChat, RespuestaChat } from "@/types";

/**
 * Servicio de Asistente Clínico Conversacional con confirmación opaca
 */
export const chatService = {
  sendMessage(
    mensaje: string,
    contexto: ContextoChat,
    confirmarAccion?: { id: string; token: string },
  ): Promise<RespuestaChat> {
    return repositories.chat.sendMessage(mensaje, contexto, confirmarAccion);
  },
};
