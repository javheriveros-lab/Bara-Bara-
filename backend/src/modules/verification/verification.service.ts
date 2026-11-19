import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VerificationDocType, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import type { SubmitVerificationDto } from './dto/verification.dto';

const DOC_ORDER: VerificationDocType[] = ['INE', 'INE_BACK', 'PROOF_OF_ADDRESS'];

/**
 * Verificación opcional: INE (frente y reverso) + comprobante de domicilio, revisados a mano por un admin.
 * Los archivos son privados en ImageKit; a los demás vecinos solo les llega la insignia.
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /** Estado para el propio vecino. Nunca incluye los archivos. */
  async mine(userId: string) {
    const [user, last] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { verificationStatus: true } }),
      this.prisma.verificationDocument.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, reviewedAt: true, reviewerNote: true },
      }),
    ]);
    return {
      status: user.verificationStatus,
      reviewerNote: user.verificationStatus === 'REJECTED' ? (last?.reviewerNote ?? null) : null,
      submittedAt: last?.createdAt ?? null,
      reviewedAt: last?.reviewedAt ?? null,
    };
  }

  async submit(userId: string, dto: SubmitVerificationDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { verificationStatus: true } });
    if (user.verificationStatus === 'PENDING') throw new ConflictException('Tus documentos ya están en revisión');
    if (user.verificationStatus === 'VERIFIED') throw new ConflictException('Tu cuenta ya está verificada');

    if (new Set([dto.ineFront.fileId, dto.ineBack.fileId, dto.proofOfAddress.fileId]).size !== 3) {
      throw new BadRequestException('Sube un archivo distinto para cada documento');
    }
    // Se comprueba cada archivo en ImageKit: carpeta propia, privado, tipo y tamaño.
    const [ine, ineBack, address] = await Promise.all([
      this.uploads.verifyPrivateUpload(dto.ineFront, userId, 'kyc'),
      this.uploads.verifyPrivateUpload(dto.ineBack, userId, 'kyc'),
      this.uploads.verifyPrivateUpload(dto.proofOfAddress, userId, 'kyc'),
    ]);
    const files: Record<VerificationDocType, string> = { INE: ine, INE_BACK: ineBack, PROOF_OF_ADDRESS: address };

    await this.prisma.verificationDocument.createMany({
      data: DOC_ORDER.map((type) => ({ userId, type, fileUrl: files[type] })),
    });
    await this.prisma.user.update({ where: { id: userId }, data: { verificationStatus: 'PENDING', kycConsentAt: new Date() } });
    return this.mine(userId);
  }

  // ─────────────── Revisión (admin) ───────────────

  /** Solicitudes con enlaces temporales (10 min) a los documentos. */
  async listForReview(status: VerificationStatus) {
    const users = await this.prisma.user.findMany({
      where: { verificationStatus: status },
      select: {
        id: true,
        displayName: true,
        email: true,
        neighborhood: true,
        createdAt: true,
        verificationDocuments: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    return users.map(({ verificationDocuments: docs, ...u }) => ({
      ...u,
      submittedAt: docs[0]?.createdAt ?? null,
      documents: DOC_ORDER.map((type) => {
        const doc = docs.find((d) => d.type === type);
        return {
          type,
          url: doc ? this.uploads.signedPrivateUrl(doc.fileUrl) : null,
          isPdf: doc?.fileUrl.toLowerCase().endsWith('.pdf') ?? false,
        };
      }),
    }));
  }

  async approve(userId: string) {
    await this.assertPending(userId);
    const now = new Date();
    await this.prisma.verificationDocument.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'VERIFIED', reviewedAt: now },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'VERIFIED', ineVerified: true, addressProofVerified: true, verifiedAt: now },
    });
    return { ok: true };
  }

  async reject(userId: string, note: string) {
    await this.assertPending(userId);
    await this.prisma.verificationDocument.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'REJECTED', reviewerNote: note, reviewedAt: new Date() },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { verificationStatus: 'REJECTED' } });
    return { ok: true };
  }

  private async assertPending(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { verificationStatus: true } });
    if (!user || user.verificationStatus !== 'PENDING') {
      throw new NotFoundException('No hay una solicitud en revisión para este vecino');
    }
  }
}
