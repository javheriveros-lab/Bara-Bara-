import { NextResponse, type NextRequest } from 'next/server';
import { isTokenExpired, SESSION_COOKIE } from './lib/session-token';

/**
 * Filtro rápido de rutas privadas: sin cookie vigente → /entrar?next=…
 * No verifica la firma (el secreto JWT vive solo en el backend); cada página
 * privada confirma la sesión con `getCurrentUser()`.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && !isTokenExpired(token)) return NextResponse.next();

  const login = new URL('/entrar', req.url);
  login.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  const res = NextResponse.redirect(login);
  if (token) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ['/perfil/:path*', '/publicar/:path*', '/mensajes/:path*', '/admin/:path*', '/guardados/:path*'],
};
