import { PricingModel, ServiceCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { NoProhibitedContent } from '../../../common/moderation/no-prohibited-content.decorator';
import { OnlyFieldsFor } from '../../../common/validation/discriminated-fields';
import { trim } from '../../../common/validation/transforms';
import { IsWeeklyAvailability, type WeeklyAvailability } from './is-weekly-availability';

/**
 * FIXED  → basePrice = precio del trabajo
 * HOURLY → basePrice = tarifa por hora
 * QUOTE  → sin basePrice: se cotiza por chat tras conocer el trabajo
 */
export const PRICING_MODEL_FIELDS = {
  FIXED: ['basePrice'],
  HOURLY: ['basePrice'],
  QUOTE: [],
} as const satisfies Record<PricingModel, readonly (keyof CreateServiceDto)[]>;

export class CreateServiceDto {
  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  // Moderación: sin artículos robados/ajenos, armas, drogas ni servicios sexuales.
  @NoProhibitedContent()
  @Transform(trim)
  @IsString()
  @Length(3, 80)
  title: string;

  @NoProhibitedContent()
  @Transform(trim)
  @IsString()
  @Length(10, 2000)
  description: string;

  @Transform(trim)
  @IsString()
  @Length(2, 80)
  neighborhood: string;

  @IsEnum(PricingModel, { message: 'pricingModel debe ser FIXED, HOURLY o QUOTE' })
  @OnlyFieldsFor(PRICING_MODEL_FIELDS)
  pricingModel: PricingModel;

  @ValidateIf((o: CreateServiceDto) => o.pricingModel !== PricingModel.QUOTE)
  @IsDefined({ message: 'basePrice es obligatorio con precio fijo o por hora' })
  @Type(() => Number)
  @Min(1)
  @Max(100_000)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(30)
  @IsInt()
  coverageRadiusKm?: number;

  /** Fotos del trabajo (portafolio). Solo URLs de ImageKit del propio vecino: lo revisa ServicesService. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUrl({ protocols: ["https"], require_protocol: true }, { each: true })
  images?: string[];

  @IsOptional()
  @IsWeeklyAvailability()
  availability?: WeeklyAvailability;
}
