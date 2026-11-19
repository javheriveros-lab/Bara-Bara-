import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import type { OwnerStatus } from '../../common/validation/owner-status.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService, publicOwner } from '../billing/billing.service';
import { UploadsService } from '../uploads/uploads.service';
import { publicUserSelect } from '../users/public-user.select';
import type { CreateListingDto } from './dto/create-listing.dto';
import type { ListListingsQuery } from './dto/list-listings.query';

const withOwner = { owner: { select: publicUserSelect } } as const;

/** Filtro de texto: coincide en título o descripción, sin distinguir mayúsculas. */
export function textFilter(q?: string) {
  return q
    ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] }
    : {};
}

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly billing: BillingService,
  ) {}

  async create(ownerId: string, dto: CreateListingDto) {
    await this.billing.assertCanPublish(ownerId);
    this.uploads.assertOwnImages(dto.images, ownerId);
    return this.prisma.listing.create({
      data: {
        ...dto,
        images: dto.images ?? [],
        barterWants: dto.barterWants ?? [],
        ownerId,
      },
      include: withOwner,
    });
  }

  findAll({ type, neighborhood, category, q, take, skip }: ListListingsQuery) {
    return this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        // Se ocultan las de quien debe comisiones vencidas o está suspendido.
        owner: publicOwner,
        type,
        category: category ? { equals: category, mode: 'insensitive' } : undefined,
        neighborhood: neighborhood ? { equals: neighborhood, mode: 'insensitive' } : undefined,
        ...textFilter(q),
      },
      include: withOwner,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  /** Detalle público: las borradas o de cuentas suspendidas no existen para nadie. */
  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { owner: { select: { ...publicUserSelect, suspendedAt: true } } },
    });
    if (!listing || listing.status === ListingStatus.REMOVED || listing.owner.suspendedAt) {
      throw new NotFoundException('Publicación no encontrada');
    }
    const { suspendedAt: _hidden, ...owner } = listing.owner;
    return { ...listing, owner };
  }

  /** "Mis publicaciones": todas las del dueño menos las borradas, la más reciente primero. */
  findMine(ownerId: string) {
    return this.prisma.listing.findMany({
      where: { ownerId, status: { not: ListingStatus.REMOVED } },
      include: withOwner,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async ownListing(id: string, ownerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id }, select: { ownerId: true, type: true, status: true } });
    if (!listing || listing.status === ListingStatus.REMOVED) throw new NotFoundException('Publicación no encontrada');
    if (listing.ownerId !== ownerId) throw new ForbiddenException('Solo el dueño puede cambiar esta publicación');
    return listing;
  }

  /** Edición completa (mismo formulario que al publicar). El tipo no cambia. */
  async update(id: string, ownerId: string, dto: CreateListingDto) {
    const current = await this.ownListing(id, ownerId);
    if (dto.type !== current.type) throw new BadRequestException('No se puede cambiar el tipo de una publicación');
    this.uploads.assertOwnImages(dto.images, ownerId);
    const { type: _type, ...fields } = dto;
    return this.prisma.listing.update({
      where: { id },
      data: { ...fields, images: dto.images ?? [], barterWants: dto.barterWants ?? [] },
      include: withOwner,
    });
  }

  /** Pausar, reactivar o marcar como vendida/rentada/intercambiada (CLOSED). */
  async setStatus(id: string, ownerId: string, status: OwnerStatus) {
    const current = await this.ownListing(id, ownerId);
    if (status === 'ACTIVE' && current.status !== ListingStatus.ACTIVE) await this.billing.assertCanPublish(ownerId);
    return this.prisma.listing.update({ where: { id }, data: { status: ListingStatus[status] }, include: withOwner });
  }

  /** Borrado lógico: conserva chats, tratos y reportes. */
  async remove(id: string, ownerId: string) {
    await this.ownListing(id, ownerId);
    await this.prisma.listing.update({ where: { id }, data: { status: ListingStatus.REMOVED } });
    return { ok: true };
  }
}
