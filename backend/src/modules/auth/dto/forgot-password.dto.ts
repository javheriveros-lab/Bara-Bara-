import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { toLowerTrim } from '../../../common/validation/transforms';

export class ForgotPasswordDto {
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(254)
  email: string;
}
