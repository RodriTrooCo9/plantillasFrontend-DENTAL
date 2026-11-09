/**
 * CONFIGURACIÓN CENTRALIZADA Y VARIABLES DE ENTORNO
 * Provee las constantes y URLs base tanto para Server Components / Proxy BFF
 * como para el cliente HTTP centralizado.
 */

export const API_CONFIG = {
  /**
   * URL base del backend NestJS (puerto 3001 y prefijo /api por defecto).
   * En el servidor usa API_URL o NEXT_PUBLIC_API_URL.
   */
  get serverBaseUrl(): string {
    return (
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001/api"
    ).replace(/\/$/, "");
  },

  /**
   * URL pública de referencia configurada en el entorno.
   */
  publicApiUrl:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",

  /**
   * Base same-origin para las peticiones del cliente a través del proxy BFF de Next.js.
   */
  clientProxyBaseUrl: "/api/backend",

  /**
   * Fuente de datos activa: 'http' (NestJS real) o 'mock' (demostración / tests unitarios).
   */
  get dataSource(): "http" | "mock" {
    const mode = process.env.NEXT_PUBLIC_DATA_SOURCE || "mock";
    return mode === "http" ? "http" : "mock";
  },
} as const;

export const AUTH_CONFIG = {
  sessionCookieName: "lumina_refresh",
  sessionChannelKey: "lumina_session_event",
} as const;

export const CLINIC_CONFIG = {
  timeZone:
    process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || "America/Mexico_City",
  defaultCurrency: "MXN",
} as const;
