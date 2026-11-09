/**
 * CLIENTE HTTP CENTRALIZADO
 * Gestiona peticiones HTTP hacia el backend NestJS (vía proxy same-origin /api/backend
 * en el navegador o directamente a API_URL / NEXT_PUBLIC_API_URL en Server Components),
 * incluyendo inyección de Bearer JWT en memoria, renovación automática ante 401
 * y validación estricta de contratos con Zod.
 */

import type { z } from "zod";
import { API_CONFIG } from "@/config";
import {
  httpClient,
  HttpApiError,
  setHttpTokens,
  refreshHttpSession,
  onHttpSessionExpired,
  parseResponse,
} from "@/data/http/client";

export {
  httpClient,
  HttpApiError,
  setHttpTokens,
  refreshHttpSession,
  onHttpSessionExpired,
  parseResponse,
};

/**
 * Helper de lectura para Server Components que consulta directamente el backend NestJS
 * configurado en NEXT_PUBLIC_API_URL / API_URL (http://localhost:3001/api).
 */
export async function serverApiFetch<T>(
  endpoint: string,
  schema?: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_CONFIG.serverBaseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new HttpApiError(
      response.status,
      `Error al consultar ${endpoint} (${response.status}).`,
    );
  }

  const data: unknown = response.status === 204 ? undefined : await response.json();
  return schema ? parseResponse(schema, data) : (data as T);
}
