import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/jwt-payload';

/**
 * Va después de JwtAuthGuard. El rol se comprueba en la base, no en el token:
 * quitarle el rol a alguien surte efecto de inmediato aunque su JWT siga vigente.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    const row = user && (await this.prisma.user.findUnique({ where: { id: user.id }, select: { role: true } }));
    if (row?.role !== 'ADMIN') throw new ForbiddenException('Solo para el equipo de Bara Bara');
    return true;
  }
}
