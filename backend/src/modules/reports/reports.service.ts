import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { forgetSuspension } from '../auth/jwt-auth.guard';
import type { CreateReportDto } from './dto/create-report.dto';

const userBrief = { select: { id: true, displayName: true, email: true, suspendedAt: true } } as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, { listingId, serviceId, reason, note }: CreateReportDto) {
    if (Boolean(listingId) === Boolean(serviceId)) {
      throw new BadRequestException('Indica listingId o serviceId (solo uno)');
    }
    const reportedUserId = listingId
      ? (await this.prisma.listing.findUnique({ where: { id: listingId }, select: { ownerId: true } }))?.ownerId
      : (await this.prisma.service.findUnique({ where: { id: serviceId }, select: { providerId: true } }))?.providerId;
    if (!reportedUserId) throw new NotFoundException('No encontramos lo que quieres reportar');
    if (reportedUserId === reporterId) throw new BadRequestException('No puedes reportar tu propia publicación');

    // Un reporte abierto por persona y publicación basta.
    const open = await this.prisma.report.findFirst({
      where: { reporterId, listingId, serviceId, status: ReportStatus.OPEN },
      select: { id: true },
    });
    if (open) throw new ConflictException('Ya reportaste esto; lo estamos revisando');

    await this.prisma.report.create({
      data: { reporterId, listingId, serviceId, reportedUserId, reason, note: note || undefined },
    });
    return { ok: true };
  }

  listForReview(status: ReportStatus) {
    return this.prisma.report.findMany({
      where: { status },
      include: {
        reporter: { select: { id: true, displayName: true } },
        reportedUser: userBrief,
        listing: { select: { id: true, title: true, status: true } },
        service: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: status === ReportStatus.OPEN ? 'asc' : 'desc' },
      take: 100,
    });
  }

  private async openReport(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    if (report.status !== ReportStatus.OPEN) throw new ConflictException('Este reporte ya se resolvió');
    return report;
  }

  /** Quita la publicación o el servicio reportado y cierra todos sus reportes abiertos. */
  async removeContent(id: string, adminId: string) {
    const report = await this.openReport(id);
    const resolved = { status: ReportStatus.ACTIONED, resolvedById: adminId, resolvedAt: new Date() };
    if (report.listingId) {
      await this.prisma.$transaction([
        this.prisma.listing.update({ where: { id: report.listingId }, data: { status: 'REMOVED' } }),
        this.prisma.report.updateMany({ where: { listingId: report.listingId, status: ReportStatus.OPEN }, data: resolved }),
      ]);
    } else if (report.serviceId) {
      await this.prisma.$transaction([
        this.prisma.service.update({ where: { id: report.serviceId }, data: { status: 'REMOVED' } }),
        this.prisma.report.updateMany({ where: { serviceId: report.serviceId, status: ReportStatus.OPEN }, data: resolved }),
      ]);
    }
    return { ok: true };
  }

  async dismiss(id: string, adminId: string) {
    await this.openReport(id);
    await this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.DISMISSED, resolvedById: adminId, resolvedAt: new Date() },
    });
    return { ok: true };
  }

  /** Suspende a la persona reportada: no entra, y sus publicaciones dejan de verse. */
  async suspendUser(userId: string, adminId: string, reason: string) {
    if (userId === adminId) throw new BadRequestException('No puedes suspender tu propia cuenta');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'ADMIN') throw new BadRequestException('No se puede suspender a un admin');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { suspendedAt: now, suspendedReason: reason } }),
      this.prisma.report.updateMany({
        where: { reportedUserId: userId, status: ReportStatus.OPEN },
        data: { status: ReportStatus.ACTIONED, resolvedById: adminId, resolvedAt: now },
      }),
    ]);
    forgetSuspension(userId);
    return { ok: true };
  }

  async unsuspendUser(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { suspendedAt: null, suspendedReason: null } });
    forgetSuspension(userId);
    return { ok: true };
  }
}
