import { ServiceCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/validation/pagination.dto';
import { trim } from '../../../common/validation/transforms';

export class ListServicesQuery extends PaginationDto {
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  /** Búsqueda libre en título y descripción. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  q?: string;
}
