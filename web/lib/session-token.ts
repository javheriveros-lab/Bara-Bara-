// Sin dependencias de Node ni de next/headers: se usa también en middleware (Edge runtime).

export const SESSION_COOKIE = 'bb_session';

/**
 * Lee `exp` (segundos) del JWT SIN verificar la firma. Solo sirve para decidir la
 * caducidad de la cookie y descartar tokens vencidos antes de llamar a la API;
 * la verificación real siempre la hace el backend.
 */
export function tokenExpiry(token: string): number | undefined {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : undefined;
  } catch {
    return undefined;
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = tokenExpiry(token);
  return exp === undefined || exp * 1000 <= Date.now();
}
