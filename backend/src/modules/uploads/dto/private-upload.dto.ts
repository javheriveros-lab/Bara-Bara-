import { IsString, Matches } from 'class-validator';

/** Documento que el cliente subió a su carpeta privada de ImageKit (campo `fileId` de la respuesta). */
export class PrivateUploadDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,64}$/, { message: 'Documento inválido' })
  fileId: string;
}
