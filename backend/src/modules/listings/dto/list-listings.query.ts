import { ListingType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/validation/pagination.dto';
import { trim } from '../../../common/validation/transforms';

export class ListListingsQuery extends PaginationDto {
  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  category?: string;

  /** Búsqueda libre en título y descripción. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  q?: string;
}
