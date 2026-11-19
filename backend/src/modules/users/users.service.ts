import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from './public-user.select';

/** Perfil propio: lo público + datos de contacto y detalle de verificación. */
const selfUserSelect = {
  ...publicUserSelect,
  email: true,
  phone: true,
  bio: true,
  role: true,
  ineVerified: true,
  addressProofVerified: true,
  verifiedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Incluye passwordHash: solo para uso interno de AuthService. */
  findByEmailWithSecret(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(
    data: Pick<Prisma.UserCreateInput, 'email' | 'passwordHash' | 'displayName' | 'neighborhood' | 'acceptedTermsAt' | 'termsVersion'>,
  ) {
    return this.prisma.user.create({ data, select: selfUserSelect });
  }

  findSelf(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: selfUserSelect });
  }

  /** Perfil público. Las cuentas suspendidas no se muestran. */
  async findPublic(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, select: { ...publicUserSelect, suspendedAt: true } });
    if (!row || row.suspendedAt) return null;
    const { suspendedAt: _hidden, ...user } = row;
    return user;
  }

  /** Nombre y colonia. */
  updateProfile(id: string, data: { displayName?: string; neighborhood?: string | null }) {
    return this.prisma.user.update({ where: { id }, data, select: selfUserSelect });
  }

  /** Cambia la contraseña pidiendo la actual. */
  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
    if (!row || !(await bcrypt.compare(currentPassword, row.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    return { ok: true };
  }
}
