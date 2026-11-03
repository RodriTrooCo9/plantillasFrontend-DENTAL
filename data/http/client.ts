/**
 * CLIENTE HTTP ÚNICO Y CENTRALIZADO
 * Conecta con el futuro backend en NestJS o API Gateway mediante una única URL base:
 * process.env.NEXT_PUBLIC_API_URL
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export function setHttpTokens(access: string | null, refresh: string | null) {
  inMemoryAccessToken = access;
  inMemoryRefreshToken = refresh;
}

export class HttpApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'HttpApiError';
  }
}

export async function httpClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Soporte para cookies httpOnly cuando NestJS esté en producción
  });

  // Interceptor de expiración 401 -> Refresh Token automático
  if (response.status === 401 && inMemoryRefreshToken) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken: inMemoryRefreshToken}),
      credentials: 'include',
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      inMemoryAccessToken = data.accessToken;
      headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
      const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
      if (!retryRes.ok) {
        throw new HttpApiError(retryRes.status, 'Error tras renovar sesión.');
      }
      return retryRes.json() as Promise<T>;
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new HttpApiError(
      response.status,
      errBody.message || `Error HTTP ${response.status} en ${endpoint}`,
      errBody.code
    );
  }

  return response.json() as Promise<T>;
}
