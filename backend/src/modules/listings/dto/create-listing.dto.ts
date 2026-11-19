import { ItemCondition, ListingType, RentalPeriod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
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
import { trim, trimEach } from '../../../common/validation/transforms';

const MAX_AMOUNT = 1_000_000;
const money = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };
// Con stopAtFirstError, class-validator ejecuta primero el decorador más cercano a la
// propiedad: @IsNumber va al final para que "abc" diga "número inválido" y no "mayor que…".

/** Campos exclusivos de cada tipo de publicación. */
export const LISTING_TYPE_FIELDS = {
  SALE: ['price'],
  RENT: ['rentalRate', 'rentalPeriod', 'deposit'],
  BARTER: ['barterWants', 'acceptsServices'],
} as const satisfies Record<ListingType, readonly (keyof CreateListingDto)[]>;

export class CreateListingDto {
  @IsEnum(ListingType, { message: 'type debe ser SALE, RENT o BARTER' })
  @OnlyFieldsFor(LISTING_TYPE_FIELDS)
  type: ListingType;

  // ── Comunes ──

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

  @NoProhibitedContent()
  @Transform(trim)
  @IsString()
  @Length(2, 40)
  category: string;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  /** Solo URLs de ImageKit del propio vecino: lo revisa ListingsService. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  images?: string[];

  @Transform(trim)
  @IsString()
  @Length(2, 80)
  neighborhood: string;

  // ── Venta ──

  @ValidateIf((o: CreateListingDto) => o.type === ListingType.SALE)
  @IsDefined({ message: 'price es obligatorio para una venta' })
  @Type(() => Number)
  @Min(1)
  @Max(MAX_AMOUNT)
  @IsNumber(money)
  price?: number;

  // ── Renta ──

  @ValidateIf((o: CreateListingDto) => o.type === ListingType.RENT)
  @IsDefined({ message: 'rentalRate es obligatorio para una renta' })
  @Type(() => Number)
  @Min(1)
  @Max(MAX_AMOUNT)
  @IsNumber(money)
  rentalRate?: number;

  @ValidateIf((o: CreateListingDto) => o.type === ListingType.RENT)
  @IsDefined({ message: 'rentalPeriod es obligatorio para una renta' })
  @IsEnum(RentalPeriod, { message: 'rentalPeriod debe ser HOUR, DAY o WEEK' })
  rentalPeriod?: RentalPeriod;

  /** Obligatorio en renta; 0 = sin depósito. */
  @ValidateIf((o: CreateListingDto) => o.type === ListingType.RENT)
  @IsDefined({ message: 'deposit es obligatorio para una renta (usa 0 si no pides depósito)' })
  @Type(() => Number)
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsNumber(money)
  deposit?: number;

  // ── Trueque ──

  // En trueque también: nada de "favores" prohibidos a cambio.
  @NoProhibitedContent()
  @ValidateIf((o: CreateListingDto) => o.type === ListingType.BARTER)
  @IsDefined({ message: 'Indica qué buscas a cambio en el intercambio' })
  @Transform(trimEach)
  @IsArray()
  @ArrayMinSize(1, { message: 'Indica al menos una cosa que buscas a cambio' })
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(2, 60, { each: true })
  barterWants?: string[];

  @IsOptional()
  @IsBoolean()
  acceptsServices?: boolean;
}
