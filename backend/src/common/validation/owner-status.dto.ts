import { IsIn } from 'class-validator';

/** Estados que el dueño puede poner a mano. REMOVED solo con DELETE; RESERVED solo por un trato. */
export const OWNER_STATUSES = ['ACTIVE', 'PAUSED', 'CLOSED'] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];

export class OwnerStatusDto {
  @IsIn(OWNER_STATUSES, { message: 'Estado inválido' })
  status: OwnerStatus;
}
