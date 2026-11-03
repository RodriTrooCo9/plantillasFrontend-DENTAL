import { z } from "zod";
import { authSchema, type AuthDto } from "./schemas";
const BASE_URL = "/api/backend";
let accessToken: string | null = null;
let refreshPromise: Promise<AuthDto> | null = null;
let generation = 0;
let onExpired: (() => void) | undefined;
export function onHttpSessionExpired(listener: () => void) {
  onExpired = listener;
}
export function setHttpTokens(access: string | null) {
  accessToken = access;
  generation++;
}
export class HttpApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpApiError";
  }
}
export function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpApiError(
      502,
      "La respuesta del servidor no coincide con el contrato.",
      "INVALID_RESPONSE",
    );
  return result.data;
}
async function body(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpApiError(
      502,
      "El servidor devolvió una respuesta inválida.",
      "INVALID_JSON",
    );
  }
}
async function checked(response: Response): Promise<unknown> {
  const value = await body(response);
  if (!response.ok) {
    const err = z
      .object({
        message: z.union([z.string(), z.array(z.string())]).optional(),
        code: z.string().optional(),
      })
      .safeParse(value);
    const message = err.success ? err.data.message : undefined;
    throw new HttpApiError(
      response.status,
      Array.isArray(message)
        ? message.join(" ")
        : message ||
            `No fue posible completar la solicitud (${response.status}).`,
      err.success ? err.data.code : undefined,
    );
  }
  return value;
}
export async function refreshHttpSession(): Promise<AuthDto> {
  if (!refreshPromise) {
    const current = generation;
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        const dto = parseResponse(authSchema, await checked(res));
        if (generation !== current)
          throw new HttpApiError(401, "La sesión se cerró.");
        accessToken = dto.access_token;
        return dto;
      } catch (error) {
        if (generation === current) {
          setHttpTokens(null);
          onExpired?.();
        }
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}
export async function httpClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const tokenAtStart = accessToken;
  if (tokenAtStart) headers.set("Authorization", `Bearer ${tokenAtStart}`);
  const send = () =>
    fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  let response = await send();
  if (response.status === 401 && !endpoint.startsWith("/auth/")) {
    if (tokenAtStart === accessToken) await refreshHttpSession();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    response = await send();
    if (response.status === 401) {
      setHttpTokens(null);
      onExpired?.();
    }
  }
  const value = await checked(response);
  return schema ? parseResponse(schema, value) : (value as T);
}
