import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * El vendedor/prestador propone cerrar con el precio final acordado en el chat.
 * Tipo, fianza y comisión los decide la API a partir de la publicación, nunca el cliente.
 * En trueque no se envía monto.
 */
export class ProposeDealDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(1_000_000)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  amount?: number;
}
