import { Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUserSelect } from '../users/public-user.select';
import type { SavedKind } from './dto/save-item.dto';

const keyOf = (kind: SavedKind, id: string) => `${kind === 'listing' ? 'L' : 'S'}:${id}`;

@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guardados del vecino, lo más reciente primero. Solo publicaciones que siguen activas. */
  async list(userId: string) {
    const rows = await this.prisma.savedItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        listing: { include: { owner: { select: publicUserSelect } } },
        service: { include: { provider: { select: publicUserSelect } } },
      },
    });
    return rows
      .filter((r) => (r.listing ? r.listing.status === ListingStatus.ACTIVE : r.service?.status === ServiceStatus.ACTIVE))
      .map((r) => ({ savedAt: r.createdAt, listing: r.listing ?? undefined, service: r.service ?? undefined }));
  }

  /** Claves ("L:<id>" / "S:<id>") para marcar el botón de guardar sin traer todo. */
  async keys(userId: string) {
    const rows = await this.prisma.savedItem.findMany({ where: { userId }, select: { itemKey: true } });
    return rows.map((r) => r.itemKey);
  }

  async save(userId: string, kind: SavedKind, id: string) {
    const exists =
      kind === 'listing'
        ? await this.prisma.listing.findUnique({ where: { id }, select: { id: true } })
        : await this.prisma.service.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Publicación no encontrada');
    const itemKey = keyOf(kind, id);
    await this.prisma.savedItem.upsert({
      where: { userId_itemKey: { userId, itemKey } },
      create: { userId, itemKey, listingId: kind === 'listing' ? id : undefined, serviceId: kind === 'service' ? id : undefined },
      update: {},
    });
    return { saved: true };
  }

  async remove(userId: string, kind: SavedKind, id: string) {
    await this.prisma.savedItem.deleteMany({ where: { userId, itemKey: keyOf(kind, id) } });
    return { saved: false };
  }
}
