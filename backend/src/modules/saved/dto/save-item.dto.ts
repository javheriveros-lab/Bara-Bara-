import { IsIn, IsMongoId } from 'class-validator';

export const SAVED_KINDS = ['listing', 'service'] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export class SaveItemDto {
  @IsIn(SAVED_KINDS)
  kind!: SavedKind;

  @IsMongoId()
  id!: string;
}
