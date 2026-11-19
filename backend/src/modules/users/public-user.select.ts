import { Prisma } from '@prisma/client';

/**
 * Campos de un vecino que pueden salir por la API pública o por el socket.
 * Nunca incluye email, teléfono, passwordHash, documentos de verificación ni montos de comisiones.
 */
export const publicUserSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  neighborhood: true,
  verificationStatus: true,
  reputationScore: true,
  reviewCount: true,
  reliablePayer: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
