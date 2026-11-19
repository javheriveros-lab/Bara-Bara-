import { Transform, Type } from 'class-transformer';
import { IsDate, IsInt, IsMongoId, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { trim } from '../../../common/validation/transforms';

/** Abre (o reutiliza) una negociación sobre una publicación o un servicio. Exactamente uno de los dos. */
export class StartConversationDto {
  @ValidateIf((o: StartConversationDto) => o.serviceId === undefined)
  @IsMongoId({ message: '$property debe ser un identificador válido' })
  listingId?: string;

  @ValidateIf((o: StartConversationDto) => o.listingId === undefined)
  @IsMongoId({ message: '$property debe ser un identificador válido' })
  serviceId?: string;
}

export class ListMessagesQuery {
  /** Paginación hacia atrás: mensajes anteriores a esta fecha (ISO). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  /** Puesta al día tras reconectar: mensajes posteriores a esta fecha (ISO). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  after?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take = 50;
}

/** Payload del evento `message:send`. El remitente sale del JWT, nunca del cliente. */
export class SendMessageDto {
  @IsMongoId({ message: '$property debe ser un identificador válido' })
  conversationId: string;

  @Transform(trim)
  @IsString()
  @Length(1, 2000, { message: 'El mensaje debe tener entre 1 y 2000 caracteres' })
  body: string;
}

/** Payload de `conversation:read`. */
export class ConversationRefDto {
  @IsMongoId({ message: '$property debe ser un identificador válido' })
  conversationId: string;
}
