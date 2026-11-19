import type { SelfUser } from '@bara/shared';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { apiFetch } from './api';
import { isTokenExpired, SESSION_COOKIE, tokenExpiry } from './session-token';

/** Solo en Server Actions / Route Handlers (Next no permite escribir cookies al renderizar). */
export async function setSessionCookie(token: string) {
  const exp = tokenExpiry(token);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: exp ? new Date(exp * 1000) : undefined,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token && !isTokenExpired(token) ? token : undefined;
}

/** Vecino con sesión, validado por el backend. Memoizado por request. */
export const getCurrentUser = cache(async (): Promise<SelfUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  const res = await apiFetch<SelfUser | null>('/users/me', { token });
  return res.ok ? res.data : null;
});

/**
 * IP del vecino según el proxy más cercano (última entrada de X-Forwarded-For).
 * Las primeras entradas las puede escribir el propio cliente, así que no se usan.
 */
export async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? h.get('x-real-ip') ?? undefined;
}
