import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../users/public-user.select';
import type { ListMessagesQuery, StartConversationDto } from './dto/chat.dto';

/** Solo perfiles públicos: email y teléfono nunca salen en la negociación. */
const conversationInclude = {
  participants: { select: { lastReadAt: true, user: { select: publicUserSelect } } },
  listing: { select: { id: true, title: true, type: true, ownerId: true } },
  service: { select: { id: true, title: true, category: true, providerId: true } },
} satisfies Prisma.ConversationInclude;

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  body: true,
  kind: true,
  dealId: true,
  createdAt: true,
} satisfies Prisma.MessageSelect;

/** Aviso del sistema ligado a un trato (se muestra como tarjeta, no como burbuja). */
export interface DealNotice {
  dealId: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async startConversation(userId: string, { listingId, serviceId }: StartConversationDto) {
    if (Boolean(listingId) === Boolean(serviceId)) {
      throw new BadRequestException('Indica listingId o serviceId (solo uno)');
    }

    // Solo se puede abrir chat sobre algo vigente (no pausado, cerrado ni borrado).
    const ownerId = listingId
      ? (
          await this.prisma.listing.findFirst({
            where: { id: listingId, status: { in: ['ACTIVE', 'RESERVED'] } },
            select: { ownerId: true },
          })
        )?.ownerId
      : (await this.prisma.service.findFirst({ where: { id: serviceId, status: 'ACTIVE' }, select: { providerId: true } }))
          ?.providerId;

    if (!ownerId) throw new NotFoundException(listingId ? 'Publicación no encontrada' : 'Servicio no encontrado');
    if (ownerId === userId) throw new BadRequestException('No puedes negociar contigo mismo');

    const existing = await this.prisma.conversation.findFirst({
      where: { listingId, serviceId, participants: { some: { userId } } },
      include: conversationInclude,
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        listingId,
        serviceId,
        participants: { create: [{ userId }, { userId: ownerId }] },
      },
      include: conversationInclude,
    });
  }

  /** Bandeja: cada conversación con su último mensaje y si hay algo sin leer. */
  async listMine(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        ...conversationInclude,
        messages: { select: messageSelect, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map(({ messages, ...c }) => {
      const lastMessage = messages[0] ?? null;
      const me = c.participants.find((p) => p.user.id === userId);
      const unread =
        !!lastMessage &&
        lastMessage.senderId !== userId &&
        (!me?.lastReadAt || lastMessage.createdAt > me.lastReadAt);
      return { ...c, lastMessage, unread };
    });
  }

  async unreadCount(userId: string) {
    const all = await this.listMine(userId);
    return { count: all.filter((c) => c.unread).length };
  }

  /** Detalle de una conversación (solo participantes). Abrirla la marca como leída. */
  async getConversation(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (!conversation) throw new ForbiddenException('No participas en esta conversación');
    await this.markRead(conversationId, userId);
    return conversation;
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  async listMessages(conversationId: string, userId: string, { before, after, take }: ListMessagesQuery) {
    await this.assertParticipant(conversationId, userId);
    return this.prisma.message.findMany({
      where: {
        conversationId,
        createdAt: before || after ? { ...(before && { lt: before }), ...(after && { gt: after }) } : undefined,
      },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /** Guarda el mensaje y devuelve los userIds que deben recibirlo. Con `notice`, es un aviso de trato. */
  async saveMessage(conversationId: string, senderId: string, body: string, notice?: DealNotice) {
    await this.assertParticipant(conversationId, senderId);

    // Sin transacción a propósito: en MongoDB, una transacción que toca el participante choca
    // (WriteConflict) con un `conversation:read` simultáneo. Crear el mensaje es atómico por sí
    // mismo; ordenar la bandeja y marcar leído son pasos independientes.
    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        createdAt: now,
        ...(notice && { kind: 'DEAL', dealId: notice.dealId }),
      },
      select: messageSelect,
    });
    const [, , participants] = await Promise.all([
      this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: now } }),
      this.prisma.conversationParticipant.updateMany({
        where: { conversationId, userId: senderId },
        data: { lastReadAt: now },
      }),
      this.prisma.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true } }),
    ]);

    return { message, recipientIds: participants.map((p) => p.userId) };
  }

  /** Mismo error si no existe o si no participa, para no revelar conversaciones ajenas. */
  async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { userId: true },
    });
    if (!participant) throw new ForbiddenException('No participas en esta conversación');
  }
}
