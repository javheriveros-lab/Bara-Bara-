import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtPayload } from './jwt-payload';

export const BCRYPT_ROUNDS = 12;
/** Versión vigente de términos y aviso de privacidad (cámbiala al publicar una nueva). */
export const TERMS_VERSION = '2026-11';
const SOCKET_TOKEN_TTL = '2m';
const RESET_TTL_MS = 30 * 60_000;
// Se compara contra este hash cuando el email no existe, para no revelar cuentas por tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync('bara-bara-dummy-password', BCRYPT_ROUNDS);

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.users.create({
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        neighborhood: dto.neighborhood,
        acceptedTermsAt: new Date(),
        termsVersion: TERMS_VERSION,
      });
      return { accessToken: await this.sign(user.id, user.role), user };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ese email ya está registrado');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const found = await this.users.findByEmailWithSecret(dto.email);
    const valid = await bcrypt.compare(dto.password, found?.passwordHash ?? DUMMY_HASH);
    if (!found || !valid) throw new UnauthorizedException('Email o contraseña incorrectos');
    if (found.suspendedAt) throw new ForbiddenException('Tu cuenta está suspendida. Escríbenos si crees que es un error.');

    const user = await this.users.findSelf(found.id);
    return { accessToken: await this.sign(found.id, found.role), user };
  }

  /**
   * "Olvidé mi contraseña": si el correo existe, envía un enlace de un solo uso (30 min).
   * Siempre responde igual, para no revelar qué correos tienen cuenta.
   */
  async forgotPassword(email: string) {
    const user = await this.users.findByEmailWithSecret(email);
    if (user && !user.suspendedAt) {
      const token = randomBytes(32).toString('hex');
      // Un enlace vigente a la vez: los anteriores dejan de servir.
      await this.prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
      await this.prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      const site = (this.config.get<string>('SITE_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
      const link = `${site}/restablecer?token=${token}`;
      await this.mail.send({
        to: user.email,
        subject: 'Restablece tu contraseña de Bara Bara',
        text:
          `Hola, ${user.displayName}.\n\nPara elegir una contraseña nueva entra a este enlace (vale 30 minutos y una sola vez):\n${link}\n\n` +
          'Si no lo pediste, ignora este correo: tu contraseña sigue igual.\n\nBara Bara',
        html:
          `<p>Hola, ${escapeHtml(user.displayName)}.</p><p>Para elegir una contraseña nueva entra a este enlace (vale 30 minutos y una sola vez):</p>` +
          `<p><a href="${link}">Restablecer mi contraseña</a></p><p>Si no lo pediste, ignora este correo: tu contraseña sigue igual.</p><p>Bara Bara</p>`,
      });
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(dto.token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('El enlace no es válido o ya venció. Pide uno nuevo.');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    this.log.log(`Contraseña restablecida para el usuario ${reset.userId}`);
    return { ok: true };
  }

  /** Token de 2 minutos para el handshake del socket: el navegador no puede leer la cookie de sesión. */
  async socketToken(user: { id: string; role: Role }) {
    const payload: JwtPayload = { sub: user.id, role: user.role, typ: 'socket' };
    return { token: await this.jwt.signAsync(payload, { expiresIn: SOCKET_TOKEN_TTL }), expiresIn: SOCKET_TOKEN_TTL };
  }

  private sign(sub: string, role: Role) {
    const payload: JwtPayload = { sub, role };
    return this.jwt.signAsync(payload);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
