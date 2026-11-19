import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../../common/validation/transforms';

export class SuggestQuery {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  q?: string;
}
