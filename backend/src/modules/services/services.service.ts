import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OwnerStatus } from '../../common/validation/owner-status.dto';
import { BillingService, publicOwner } from '../billing/billing.service';
import { UploadsService } from '../uploads/uploads.service';
import { textFilter } from '../listings/listings.service';
import { publicUserSelect } from '../users/public-user.select';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { ListServicesQuery } from './dto/list-services.query';

const withProvider = { provider: { select: publicUserSelect } } as const;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly billing: BillingService,
  ) {}

  async create(providerId: string, dto: CreateServiceDto) {
    await this.billing.assertCanPublish(providerId);
    this.uploads.assertOwnImages(dto.images, providerId);
    return this.prisma.service.create({
      data: { ...dto, images: dto.images ?? [], providerId },
      include: withProvider,
    });
  }

  findAll({ category, neighborhood, q, take, skip }: ListServicesQuery) {
    return this.prisma.service.findMany({
      where: {
        status: ServiceStatus.ACTIVE,
        // Se ocultan los de quien debe comisiones vencidas o está suspendido.
        provider: publicOwner,
        category,
        neighborhood: neighborhood ? { equals: neighborhood, mode: 'insensitive' } : undefined,
        ...textFilter(q),
      },
      include: withProvider,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  /** Detalle público: los borrados o de cuentas suspendidas no existen para nadie. */
  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { provider: { select: { ...publicUserSelect, suspendedAt: true } } },
    });
    if (!service || service.status === ServiceStatus.REMOVED || service.provider.suspendedAt) {
      throw new NotFoundException('Servicio no encontrado');
    }
    const { suspendedAt: _hidden, ...provider } = service.provider;
    return { ...service, provider };
  }

  /** "Mis servicios": todos menos los borrados. */
  findMine(providerId: string) {
    return this.prisma.service.findMany({
      where: { providerId, status: { not: ServiceStatus.REMOVED } },
      include: withProvider,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async ownService(id: string, providerId: string) {
    const service = await this.prisma.service.findUnique({ where: { id }, select: { providerId: true, status: true } });
    if (!service || service.status === ServiceStatus.REMOVED) throw new NotFoundException('Servicio no encontrado');
    if (service.providerId !== providerId) throw new ForbiddenException('Solo quien ofrece el servicio puede cambiarlo');
    return service;
  }

  /** Edición completa (mismo formulario que al publicar). */
  async update(id: string, providerId: string, dto: CreateServiceDto) {
    await this.ownService(id, providerId);
    this.uploads.assertOwnImages(dto.images, providerId);
    return this.prisma.service.update({ where: { id }, data: { ...dto, images: dto.images ?? [] }, include: withProvider });
  }

  /** Pausar, reactivar o dar por terminado (CLOSED). */
  async setStatus(id: string, providerId: string, status: OwnerStatus) {
    const current = await this.ownService(id, providerId);
    if (status === 'ACTIVE' && current.status !== ServiceStatus.ACTIVE) await this.billing.assertCanPublish(providerId);
    return this.prisma.service.update({ where: { id }, data: { status: ServiceStatus[status] }, include: withProvider });
  }

  /** Borrado lógico. */
  async remove(id: string, providerId: string) {
    await this.ownService(id, providerId);
    await this.prisma.service.update({ where: { id }, data: { status: ServiceStatus.REMOVED } });
    return { ok: true };
  }
}
