import { Transform, Type } from 'class-transformer';
import { Equals, IsDefined, IsString, Length, ValidateNested } from 'class-validator';
import { trim } from '../../../common/validation/transforms';
import { PrivateUploadDto } from '../../uploads/dto/private-upload.dto';

/** Los tres documentos, ya subidos a la carpeta privada del vecino. */
export class SubmitVerificationDto {
  @IsDefined({ message: 'Sube el frente de tu INE' })
  @ValidateNested()
  @Type(() => PrivateUploadDto)
  ineFront: PrivateUploadDto;

  @IsDefined({ message: 'Sube el reverso de tu INE' })
  @ValidateNested()
  @Type(() => PrivateUploadDto)
  ineBack: PrivateUploadDto;

  @IsDefined({ message: 'Sube tu comprobante de domicilio' })
  @ValidateNested()
  @Type(() => PrivateUploadDto)
  proofOfAddress: PrivateUploadDto;

  /** Consentimiento expreso para tratar datos de identificación (LFPDPPP). */
  @Equals(true, { message: 'Debes autorizar el uso de tus documentos para verificar tu identidad' })
  kycConsent: boolean;
}

/** Motivo de rechazo: lo lee el vecino para corregir y reintentar. */
export class ReviewNoteDto {
  @Transform(trim)
  @IsString()
  @Length(5, 300, { message: 'Explica el motivo en 5 a 300 caracteres' })
  note: string;
}
