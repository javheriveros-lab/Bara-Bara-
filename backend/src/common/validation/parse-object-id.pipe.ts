import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isMongoId } from 'class-validator';

/**
 * Valida que un parámetro de ruta sea un ObjectId de MongoDB.
 * Sin esto, Prisma lanza P2023 ("Malformed ObjectID") y la API respondería 500.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isMongoId(value)) throw new BadRequestException('Identificador inválido');
    return value;
  }
}
