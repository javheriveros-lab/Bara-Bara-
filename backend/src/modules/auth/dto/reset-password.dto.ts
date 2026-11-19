import { IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(32, 128, { message: 'Enlace inválido' })
  token: string;

  // bcrypt solo usa los primeros 72 bytes
  @IsString()
  @Length(8, 72, { message: 'La contraseña debe tener entre 8 y 72 caracteres' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'La contraseña debe incluir letras y números' })
  password: string;
}
