import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Deal, DealKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays, COMMISSION_DUE_DAYS, splitAmount } from '../billing/commission';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatService } from '../chat/chat.service';
import type { ProposeDealDto } from './dto/propose-deal.dto';

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const money = (n: number) => mxn.format(n).replace(/\.00$/, '');

/**
 * Registro de tratos en la negociación:
 *   vendedor/prestador propone el precio final → comprador confirma (o cualquiera cancela).
 * Confirmar crea la comisión pendiente del vendedor (5%; 0% en trueque; en renta solo sobre la tarifa).
 * Cada paso deja un aviso en el chat y se emite en vivo (`message:new` + `deal:update`).
 */
@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  /** Último trato de la conversación (propuesto, cerrado o cancelado). */
  async current(conversationId: string, userId: string) {
    await this.chat.assertParticipant(conversationId, userId);
    const deal = await this.prisma.deal.findFirst({ where: { conversationId }, orderBy: { proposedAt: 'desc' } });
    return { deal };
  }

  async propose(conversationId: string, userId: string, dto: ProposeDealDto) {
    await this.chat.assertParticipant(conversationId, userId);
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        listing: { select: { id: true, type: true, ownerId: true, status: true, deposit: true } },
        service: { select: { id: true, providerId: true, status: true } },
        participants: { select: { userId: true } },
      },
    });
    const { listing, service } = conversation;
    if (!listing && !service) throw new BadRequestException('La publicación ya no existe');

    const sellerId = listing?.ownerId ?? service!.providerId;
    if (sellerId !== userId) {
      throw new ForbiddenException('Solo quien publica puede proponer cerrar el trato');
    }
    if ((listing?.status ?? service!.status) === 'CLOSED') {
      throw new BadRequestException('La publicación ya está cerrada');
    }
    const buyerId = conversation.participants.find((p) => p.userId !== sellerId)?.userId;
    if (!buyerId) throw new BadRequestException('La conversación no tiene con quién cerrar');

    const kind: DealKind = listing ? listing.type : 'SERVICE';
    if (kind !== 'BARTER' && dto.amount === undefined) {
      const message = 'Escribe el precio que acordaron';
      throw new BadRequestException({ statusCode: 400, error: 'Bad Request', message: [message], fields: { amount: message } });
    }

    const open = await this.prisma.deal.findFirst({ where: { conversationId, status: 'PROPOSED' }, select: { id: true } });
    if (open) throw new ConflictException('Ya hay una propuesta esperando respuesta');

    const split = splitAmount(kind, kind === 'BARTER' ? 0 : dto.amount!);
    const rentalDeposit = kind === 'RENT' ? (listing?.deposit ?? null) : null;
    const deal = await this.prisma.deal.create({
      data: {
        conversationId,
        listingId: listing?.id,
        serviceId: service?.id,
        sellerId,
        buyerId,
        kind,
        amount: split.amount,
        rentalDeposit,
        commissionRate: split.rate,
        commission: split.commission,
      },
    });

    const body =
      kind === 'BARTER'
        ? 'Propuso cerrar el intercambio'
        : kind === 'RENT'
          ? `Propuso cerrar la renta en ${money(split.amount)}${rentalDeposit ? ` + fianza de ${money(rentalDeposit)} (se devuelve)` : ''}`
          : `Propuso cerrar el trato en ${money(split.amount)}`;
    await this.announce(deal, userId, body);
    return deal;
  }

  async confirm(dealId: string, userId: string) {
    const deal = await this.findForParticipant(dealId, userId);
    if (deal.buyerId !== userId) throw new ForbiddenException('Solo la otra parte puede confirmar el trato');

    const now = new Date();
    const owes = deal.commission > 0;
    const { count } = await this.prisma.deal.updateMany({
      where: { id: dealId, status: 'PROPOSED' },
      data: {
        status: 'CONFIRMED',
        confirmedAt: now,
        commissionStatus: owes ? 'PENDING' : 'NONE',
        dueAt: owes ? addDays(now, COMMISSION_DUE_DAYS) : null,
      },
    });
    if (!count) throw new ConflictException('Esta propuesta ya no está vigente');

    // Venta y trueque: el objeto ya tiene dueño. Renta y chamba siguen disponibles.
    if (deal.listingId && (deal.kind === 'SALE' || deal.kind === 'BARTER')) {
      await this.prisma.listing.updateMany({
        where: { id: deal.listingId, status: 'ACTIVE' },
        data: { status: 'RESERVED' },
      });
    }

    const confirmed = await this.prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
    await this.announce(
      confirmed,
      userId,
      deal.kind === 'BARTER' ? 'Confirmó el intercambio' : `Confirmó el trato por ${money(deal.amount)}`,
    );
    return confirmed;
  }

  async cancel(dealId: string, userId: string) {
    const deal = await this.findForParticipant(dealId, userId);
    const { count } = await this.prisma.deal.updateMany({
      where: { id: dealId, status: 'PROPOSED' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (!count) throw new ConflictException('Esta propuesta ya no está vigente');

    const cancelled = await this.prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
    await this.announce(cancelled, userId, userId === deal.sellerId ? 'Retiró la propuesta' : 'Rechazó la propuesta');
    return cancelled;
  }

  /** Mismo 404 si no existe o si no participa, para no revelar tratos ajenos. */
  private async findForParticipant(dealId: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || (deal.sellerId !== userId && deal.buyerId !== userId)) {
      throw new NotFoundException('Trato no encontrado');
    }
    return deal;
  }

  /** Aviso en el historial + actualización en vivo para las dos partes. */
  private async announce(deal: Deal, actorId: string, body: string) {
    const { message, recipientIds } = await this.chat.saveMessage(deal.conversationId, actorId, body, {
      dealId: deal.id,
    });
    this.gateway.notify(recipientIds, 'message:new', message);
    this.gateway.notify(recipientIds, 'deal:update', { conversationId: deal.conversationId, deal });
  }
}
