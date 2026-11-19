import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { toLowerTrim } from '../../../common/validation/transforms';

export class LoginDto {
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}
