import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason } from '@prisma/client';
import { trim } from '../../../common/validation/transforms';

/** Reporte de una publicación o un servicio (uno de los dos). */
export class CreateReportDto {
  @IsOptional()
  @IsMongoId({ message: 'Publicación inválida' })
  listingId?: string;

  @IsOptional()
  @IsMongoId({ message: 'Servicio inválido' })
  serviceId?: string;

  @IsEnum(ReportReason, { message: 'Elige un motivo' })
  reason: ReportReason;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'La nota puede tener hasta 500 caracteres' })
  note?: string;
}
