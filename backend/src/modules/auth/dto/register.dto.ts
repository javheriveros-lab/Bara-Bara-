import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { toLowerTrim, trim } from '../../../common/validation/transforms';

export class RegisterDto {
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(254)
  email: string;

  // bcrypt solo usa los primeros 72 bytes
  @IsString()
  @Length(8, 72, { message: 'La contraseña debe tener entre 8 y 72 caracteres' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'La contraseña debe incluir letras y números' })
  password: string;

  @Transform(trim)
  @IsString()
  @Length(2, 40)
  displayName: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  neighborhood?: string;

  /** Aceptación expresa de términos y aviso de privacidad (LFPDPPP). */
  @Equals(true, { message: 'Debes aceptar los términos y el aviso de privacidad' })
  acceptTerms: boolean;
}
