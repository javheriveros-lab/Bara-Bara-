import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser, JwtPayload } from './jwt-payload';

/** Estado de suspensión por usuario, 30 s en memoria: un bloqueo surte efecto casi de inmediato. */
const SUSPENSION_TTL_MS = 30_000;
const suspensionCache = new Map<string, { suspended: boolean; at: number }>();

/** Para que el admin vea el efecto al instante tras bloquear o desbloquear. */
export function forgetSuspension(userId: string) {
  suspensionCache.delete(userId);
}

/** Exige `Authorization: Bearer <token>` válido, rechaza cuentas suspendidas y adjunta `request.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearer(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Falta el token de acceso');

    const user = await verifyAccessToken(this.jwt, token);
    if (await isSuspended(this.prisma, user.id)) {
      throw new ForbiddenException('Tu cuenta está suspendida. Escríbenos si crees que es un error.');
    }
    request.user = user;
    return true;
  }
}

/** Compartido con el gateway del chat. */
export async function isSuspended(prisma: PrismaService, userId: string): Promise<boolean> {
  const hit = suspensionCache.get(userId);
  if (hit && Date.now() - hit.at < SUSPENSION_TTL_MS) return hit.suspended;
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } });
  const suspended = !row || Boolean(row.suspendedAt);
  suspensionCache.set(userId, { suspended, at: Date.now() });
  return suspended;
}

export function extractBearer(header: string | undefined): string | undefined {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * Compartido entre HTTP y WebSocket. Lanza UnauthorizedException si el token no es válido.
 * Los tokens de socket (`typ: 'socket'`) solo se aceptan donde se pide `allowSocket`.
 */
export async function verifyAccessToken(
  jwt: JwtService,
  token: string,
  { allowSocket = false }: { allowSocket?: boolean } = {},
): Promise<AuthUser> {
  let payload: JwtPayload;
  try {
    payload = await jwt.verifyAsync<JwtPayload>(token);
  } catch {
    throw new UnauthorizedException('Token inválido o expirado');
  }
  if (payload.typ === 'socket' && !allowSocket) throw new UnauthorizedException('Token inválido o expirado');
  return { id: payload.sub, role: payload.role };
}
