import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MaxLength(72)
  currentPassword: string;

  // bcrypt solo usa los primeros 72 bytes
  @IsString()
  @Length(8, 72, { message: 'La contraseña debe tener entre 8 y 72 caracteres' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'La contraseña debe incluir letras y números' })
  newPassword: string;
}
