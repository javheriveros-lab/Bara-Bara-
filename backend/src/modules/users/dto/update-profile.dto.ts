import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';
import { NoProhibitedContent } from '../../../common/moderation/no-prohibited-content.decorator';
import { trim } from '../../../common/validation/transforms';

export class UpdateProfileDto {
  @IsOptional()
  @NoProhibitedContent()
  @Transform(trim)
  @IsString()
  @Length(2, 40)
  displayName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  /** null o vacío borra la colonia. */
  neighborhood?: string | null;
}
