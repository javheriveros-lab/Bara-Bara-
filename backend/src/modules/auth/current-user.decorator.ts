import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './jwt-payload';

/** Usuario autenticado por JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
