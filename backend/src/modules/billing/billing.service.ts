import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommissionPayment, CommissionPaymentStatus, Prisma } from '@prisma/client';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { PrivateUploadDto } from '../uploads/dto/private-upload.dto';
import { UploadsService } from '../uploads/uploads.service';
import {
  addDays,
  PAYMENT_REFERENCE_DAYS,
  RELIABLE_PAYER_LOOKBACK_DAYS,
  RELIABLE_PAYER_MIN_PAID,
  sumMoney,
} from './commission';

/** Vecinos sin comisiones vencidas. MongoDB: las cuentas anteriores no tienen el campo (isSet: false). */
export const notOnHold: Prisma.UserWhereInput = {
  OR: [{ billingHoldSince: null }, { billingHoldSince: { isSet: false } }],
};

/** Dueños cuyas publicaciones se muestran: sin adeudos vencidos y sin suspensión por moderación. */
export const publicOwner: Prisma.UserWhereInput = {
  AND: [notOnHold, { OR: [{ suspendedAt: null }, { suspendedAt: { isSet: false } }] }],
};

const SWEEP_INTERVAL_MS = 60 * 60_000;
// Sin 0/O/1/I/L: la referencia se dicta y se teclea en la app del banco.
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const dealWithItem = {
  listing: { select: { title: true } },
  service: { select: { title: true } },
  buyer: { select: { displayName: true } },
} satisfies Prisma.DealInclude;

export interface BankInfo {
  clabe: string;
  beneficiary: string;
  bankName: string | null;
}

/** Resultado del webhook: el proveedor solo necesita un 2xx; el estado queda en logs. */
type WebhookResult = 'paid' | 'duplicate' | 'already_paid' | 'unmatched' | 'amount_mismatch';

/**
 * Comisiones de Bara Bara: estado de cuenta, referencias SPEI, conciliación y penalización.
 *
 * - Un trato confirmado con comisión > 0 queda PENDING con fecha límite (dueAt).
 * - Vencida → `billingHoldSince`: no puede publicar y sus publicaciones se ocultan del feed.
 * - Pagada (webhook del banco/proveedor o comprobante aprobado por un admin) → se levanta el bloqueo.
 * - "Vecino Confiable": ≥3 comisiones pagadas, nada vencido y ningún pago tardío en 90 días.
 */
@Injectable()
export class BillingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────── Barrido periódico ───────────────

  onModuleInit() {
    // Los vencimientos ocurren con el paso del tiempo, no por una petición: se revisan cada hora.
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
    setTimeout(() => void this.sweep(), 10_000).unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async sweep() {
    try {
      const now = new Date();
      const [overdue, held] = await Promise.all([
        this.prisma.deal.findMany({
          where: { commissionStatus: 'PENDING', dueAt: { lt: now } },
          select: { sellerId: true },
          distinct: ['sellerId'],
        }),
        this.prisma.user.findMany({ where: { billingHoldSince: { not: null } }, select: { id: true } }),
      ]);
      const ids = new Set([...overdue.map((d) => d.sellerId), ...held.map((u) => u.id)]);
      for (const id of ids) await this.refreshStanding(id);
      if (ids.size) this.logger.log(`Estado de cobro revisado para ${ids.size} vecinos`);
    } catch (e) {
      this.logger.error('Falló el barrido de comisiones', e as Error);
    }
  }

  // ─────────────── Penalización y reputación ───────────────

  /** Recalcula el bloqueo por adeudo vencido y la insignia "Vecino Confiable". */
  async refreshStanding(userId: string) {
    const now = new Date();
    const [oldestOverdue, user, paidCount, recentPaid] = await Promise.all([
      this.prisma.deal.findFirst({
        where: { sellerId: userId, commissionStatus: 'PENDING', dueAt: { lt: now } },
        orderBy: { dueAt: 'asc' },
        select: { dueAt: true },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { billingHoldSince: true, reliablePayer: true } }),
      this.prisma.deal.count({ where: { sellerId: userId, commissionStatus: 'PAID' } }),
      this.prisma.deal.findMany({
        where: { sellerId: userId, commissionStatus: 'PAID', paidAt: { gte: addDays(now, -RELIABLE_PAYER_LOOKBACK_DAYS) } },
        select: { paidAt: true, dueAt: true },
      }),
    ]);
    if (!user) return;

    const paidLate = recentPaid.some((d) => d.paidAt && d.dueAt && d.paidAt > d.dueAt);
    const billingHoldSince = oldestOverdue ? (user.billingHoldSince ?? oldestOverdue.dueAt) : null;
    const reliablePayer = !oldestOverdue && !paidLate && paidCount >= RELIABLE_PAYER_MIN_PAID;

    const holdChanged = (user.billingHoldSince?.getTime() ?? null) !== (billingHoldSince?.getTime() ?? null);
    if (holdChanged || (user.reliablePayer ?? false) !== reliablePayer) {
      await this.prisma.user.update({ where: { id: userId }, data: { billingHoldSince, reliablePayer } });
    }
  }

  /** Publicar exige estar al corriente. Se consulta directo (no espera al barrido). */
  async assertCanPublish(userId: string) {
    const overdue = await this.prisma.deal.count({
      where: { sellerId: userId, commissionStatus: 'PENDING', dueAt: { lt: new Date() } },
    });
    if (overdue) {
      await this.refreshStanding(userId);
      throw new ForbiddenException(
        'Tienes comisiones vencidas. Págalas en tu perfil para volver a publicar y que tus publicaciones se vean.',
      );
    }
  }

  // ─────────────── Estado de cuenta ───────────────

  async summary(userId: string) {
    const now = new Date();
    const pendingWhere = { sellerId: userId, commissionStatus: 'PENDING' } satisfies Prisma.DealWhereInput;
    const [user, pending, overdue, next, deals, payments] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { billingHoldSince: true, reliablePayer: true } }),
      this.prisma.deal.aggregate({ where: pendingWhere, _sum: { commission: true } }),
      this.prisma.deal.aggregate({ where: { ...pendingWhere, dueAt: { lt: now } }, _sum: { commission: true } }),
      this.prisma.deal.findFirst({ where: pendingWhere, orderBy: { dueAt: 'asc' }, select: { dueAt: true } }),
      this.prisma.deal.findMany({
        where: { sellerId: userId, status: 'CONFIRMED', commissionStatus: { in: ['PENDING', 'PAID'] } },
        include: dealWithItem,
        orderBy: { confirmedAt: 'desc' },
        take: 50,
      }),
      this.prisma.commissionPayment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const paymentDtos = payments.map((p) => this.paymentDto(p, now));
    return {
      pendingTotal: pending._sum.commission ?? 0,
      overdueTotal: overdue._sum.commission ?? 0,
      nextDueAt: next?.dueAt ?? null,
      onHold: !!user?.billingHoldSince,
      reliablePayer: user?.reliablePayer ?? false,
      deals: deals.map(({ listing, service, buyer, ...d }) => ({
        ...d,
        itemTitle: listing?.title ?? service?.title ?? 'Publicación eliminada',
        buyerName: buyer.displayName,
        overdue: d.commissionStatus === 'PENDING' && !!d.dueAt && d.dueAt < now,
      })),
      activePayment: paymentDtos.find((p) => p.status === 'PENDING' || p.status === 'PROOF_SUBMITTED') ?? null,
      payments: paymentDtos,
      // Datos de la cuenta de Bara Bara (no son secretos): se muestran junto a la referencia vigente.
      bank: this.bankInfo(),
    };
  }

  // ─────────────── Referencias SPEI ───────────────

  bankInfo(): BankInfo | null {
    const clabe = this.config.get<string>('PAYMENT_CLABE')?.replace(/\s/g, '');
    const beneficiary = this.config.get<string>('PAYMENT_BENEFICIARY')?.trim();
    if (!clabe || !/^\d{18}$/.test(clabe) || !beneficiary) return null;
    return { clabe, beneficiary, bankName: this.config.get<string>('PAYMENT_BANK_NAME')?.trim() || null };
  }

  /**
   * Agrupa las comisiones pendientes en una referencia única. Reutiliza la vigente si cubre
   * exactamente los mismos tratos; si llegaron tratos nuevos, la reemplaza.
   */
  async createPayment(userId: string) {
    const bank = this.bankInfo();
    if (!bank) {
      throw new ServiceUnavailableException('El pago por SPEI aún no está configurado. Intenta más tarde.');
    }

    const now = new Date();
    const [pending, inReview] = await Promise.all([
      this.prisma.deal.findMany({
        where: { sellerId: userId, commissionStatus: 'PENDING' },
        select: { id: true, commission: true },
        orderBy: { confirmedAt: 'asc' },
      }),
      this.prisma.commissionPayment.findMany({
        where: { userId, status: 'PROOF_SUBMITTED' },
        select: { dealIds: true },
      }),
    ]);
    if (!pending.length) throw new BadRequestException('No tienes comisiones pendientes');

    // Lo que ya está en revisión con comprobante no se vuelve a cobrar.
    const locked = new Set(inReview.flatMap((p) => p.dealIds));
    const open = pending.filter((d) => !locked.has(d.id));
    if (!open.length) throw new ConflictException('Ya enviaste tu comprobante; lo estamos revisando.');

    const dealIds = open.map((d) => d.id).sort();
    const current = await this.prisma.commissionPayment.findFirst({
      where: { userId, status: 'PENDING', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (current && [...current.dealIds].sort().join() === dealIds.join()) {
      return { payment: this.paymentDto(current, now), bank };
    }

    await this.prisma.commissionPayment.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    const payment = await this.createWithUniqueReference({
      userId,
      amount: sumMoney(open.map((d) => d.commission)),
      dealIds,
      expiresAt: addDays(now, PAYMENT_REFERENCE_DAYS),
    });
    await this.prisma.deal.updateMany({ where: { id: { in: dealIds } }, data: { paymentId: payment.id } });
    return { payment: this.paymentDto(payment, now), bank };
  }

  private async createWithUniqueReference(data: Omit<Prisma.CommissionPaymentUncheckedCreateInput, 'reference'>) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = `BB-${Array.from({ length: 8 }, () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]).join('')}`;
      try {
        return await this.prisma.commissionPayment.create({ data: { ...data, reference } });
      } catch (e) {
        // P2002: referencia repetida (índice único). Improbable; se reintenta con otra.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new ServiceUnavailableException('No pudimos generar la referencia. Intenta de nuevo.');
  }

  /** Comprobante de transferencia (archivo privado en ImageKit). Lo revisa un admin. */
  async submitProof(userId: string, paymentId: string, upload: PrivateUploadDto) {
    const payment = await this.prisma.commissionPayment.findFirst({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Referencia no encontrada');
    if (payment.status === 'PROOF_SUBMITTED') throw new ConflictException('Ya enviaste el comprobante de este pago');
    if (payment.status !== 'PENDING') throw new BadRequestException('Esta referencia ya no admite comprobantes');

    const proofFile = await this.uploads.verifyPrivateUpload(upload, userId, 'payment');
    const updated = await this.prisma.commissionPayment.update({
      where: { id: paymentId },
      data: { status: 'PROOF_SUBMITTED', proofFile, proofSubmittedAt: new Date() },
    });
    return this.paymentDto(updated);
  }

  // ─────────────── Conciliación ───────────────

  /**
   * Webhook genérico para el banco o el agregador de pagos (Conekta, OpenPay, STP…):
   * cuerpo JSON `{ reference, amount, providerTxId }` firmado con HMAC-SHA256 del cuerpo crudo
   * usando PAYMENT_WEBHOOK_SECRET, en la cabecera `X-BaraBara-Signature` (hex).
   */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<{ status: WebhookResult }> {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Conciliación automática no configurada');
    if (!rawBody || !signature) throw new UnauthorizedException('Firma inválida');

    const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
    const given = Buffer.from(signature.trim().toLowerCase());
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('Firma inválida');
    }

    let body: { reference?: unknown; amount?: unknown; providerTxId?: unknown };
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('JSON inválido');
    }
    const { reference, amount, providerTxId } = body;
    if (typeof reference !== 'string' || typeof amount !== 'number' || typeof providerTxId !== 'string' || !providerTxId) {
      throw new BadRequestException('Se esperaba { reference, amount, providerTxId }');
    }

    if (await this.prisma.commissionPayment.findFirst({ where: { providerTxId }, select: { id: true } })) {
      return { status: 'duplicate' };
    }
    // El concepto SPEI puede traer texto extra: se busca el patrón BB-XXXXXXXX.
    const ref = reference.toUpperCase().match(/BB-[A-Z0-9]{8}/)?.[0];
    const payment = ref && (await this.prisma.commissionPayment.findUnique({ where: { reference: ref } }));
    if (!payment) {
      this.logger.warn(`Depósito sin referencia conocida (${providerTxId}): conciliar a mano`);
      return { status: 'unmatched' };
    }
    if (payment.status === 'PAID') return { status: 'already_paid' };
    if (Math.round(amount * 100) < Math.round(payment.amount * 100)) {
      this.logger.warn(`Depósito ${providerTxId} por ${amount} menor a ${payment.amount} (${payment.reference})`);
      return { status: 'amount_mismatch' };
    }

    await this.markPaid(payment.id, { providerTxId });
    return { status: 'paid' };
  }

  /** Marca la referencia y sus tratos como pagados y levanta el bloqueo si ya no debe nada. */
  async markPaid(paymentId: string, by: { providerTxId?: string; reviewerId?: string }) {
    const now = new Date();
    const { count } = await this.prisma.commissionPayment.updateMany({
      where: { id: paymentId, status: { in: ['PENDING', 'PROOF_SUBMITTED', 'CANCELLED', 'REJECTED'] } },
      data: { status: 'PAID', paidAt: now, providerTxId: by.providerTxId, reviewedById: by.reviewerId },
    });
    if (!count) throw new ConflictException('Este pago ya estaba conciliado');

    const payment = await this.prisma.commissionPayment.findUniqueOrThrow({ where: { id: paymentId } });
    await this.prisma.deal.updateMany({
      where: { id: { in: payment.dealIds }, commissionStatus: 'PENDING' },
      data: { commissionStatus: 'PAID', paidAt: now, paymentId: payment.id },
    });
    // Otras referencias abiertas pueden incluir estos tratos: se regeneran al volver a pagar.
    await this.prisma.commissionPayment.updateMany({
      where: { userId: payment.userId, status: 'PENDING', id: { not: payment.id } },
      data: { status: 'CANCELLED' },
    });
    await this.refreshStanding(payment.userId);
    return this.paymentDto({ ...payment, status: 'PAID' });
  }

  // ─────────────── Revisión manual (admin) ───────────────

  async listForReview(status: CommissionPaymentStatus) {
    const payments = await this.prisma.commissionPayment.findMany({
      where: { status },
      include: {
        user: { select: { id: true, displayName: true, email: true, neighborhood: true } },
        deals: { include: dealWithItem },
      },
      orderBy: { proofSubmittedAt: 'asc' },
      take: 50,
    });
    return payments.map(({ user, deals, ...p }) => ({
      ...this.paymentDto(p),
      user,
      proofUrl: p.proofFile ? this.uploads.signedPrivateUrl(p.proofFile) : null,
      proofIsPdf: p.proofFile?.toLowerCase().endsWith('.pdf') ?? false,
      proofSubmittedAt: p.proofSubmittedAt,
      deals: deals.map((d) => ({
        id: d.id,
        kind: d.kind,
        amount: d.amount,
        commission: d.commission,
        itemTitle: d.listing?.title ?? d.service?.title ?? 'Publicación eliminada',
        buyerName: d.buyer.displayName,
        confirmedAt: d.confirmedAt,
      })),
    }));
  }

  async reject(paymentId: string, reviewerId: string, note: string) {
    const { count } = await this.prisma.commissionPayment.updateMany({
      where: { id: paymentId, status: 'PROOF_SUBMITTED' },
      data: { status: 'REJECTED', reviewerNote: note, reviewedById: reviewerId },
    });
    if (!count) throw new NotFoundException('No hay un comprobante en revisión con ese id');
    return { ok: true };
  }

  // ─────────────── Salida ───────────────

  /** Nunca expone el archivo del comprobante; una referencia PENDING caducada se muestra como CANCELLED. */
  private paymentDto(p: CommissionPayment, now = new Date()) {
    const expired = p.status === 'PENDING' && p.expiresAt < now;
    return {
      id: p.id,
      reference: p.reference,
      amount: p.amount,
      status: expired ? ('CANCELLED' as const) : p.status,
      dealIds: p.dealIds,
      hasProof: !!p.proofFile,
      reviewerNote: p.reviewerNote,
      expiresAt: p.expiresAt,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    };
  }
}
