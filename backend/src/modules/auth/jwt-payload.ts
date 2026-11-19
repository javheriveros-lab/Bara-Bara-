import type { Role } from '@prisma/client';

/** Contenido firmado del access token. */
export interface JwtPayload {
  sub: string;
  role: Role;
  /** 'socket': token de 2 minutos solo para abrir el chat en tiempo real (no vale en la API REST). */
  typ?: 'socket';
}

/** Usuario autenticado que los guards adjuntan a la request o al socket. */
export interface AuthUser {
  id: string;
  role: Role;
}
