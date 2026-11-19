// Cliente de la API para el servidor de Next (Server Components y Server Actions).
// El token viaja desde la cookie httpOnly; el navegador nunca lo ve.
import type { ApiErrorBody } from '@bara/shared';
import { API_URL } from './env';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiErrorBody };

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  /** IP del vecino, para que el rate limit del backend no vea a todos como el servidor de Next. */
  clientIp?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, token, clientIp } = options;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(clientIp && { 'X-Forwarded-For': clientIp }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: { statusCode: 503, message: 'No pudimos conectar con el servidor. Intenta de nuevo.' },
    };
  }

  const payload = await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: payload as T };

  return {
    ok: false,
    status: res.status,
    error: (payload as ApiErrorBody | null) ?? { statusCode: res.status, message: res.statusText },
  };
}

export function errorMessage(error: ApiErrorBody): string {
  return Array.isArray(error.message) ? error.message[0] : error.message;
}
