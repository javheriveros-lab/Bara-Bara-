import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';
import { findProhibitedContent, prohibitedFieldMessage, type ProhibitedCategory } from './moderation';

/** Nombre de la restricción: el factory de validación la reconoce para marcar el 400 con PROHIBITED_CONTENT. */
export const PROHIBITED_CONSTRAINT = 'noProhibitedContent';

const firstHit = (value: unknown): ProhibitedCategory | null => {
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    const hit = typeof v === 'string' ? findProhibitedContent(v) : null;
    if (hit) return hit;
  }
  return null;
};

/**
 * Rechaza texto (o listas de texto) con términos prohibidos: artículos robados o ajenos,
 * armas, drogas y servicios sexuales. Ver common/moderation/moderation.ts.
 */
export function NoProhibitedContent(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: PROHIBITED_CONSTRAINT,
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => firstHit(value) === null,
        defaultMessage: (args?: ValidationArguments) => prohibitedFieldMessage(firstHit(args?.value) ?? 'STOLEN'),
      },
    });
}
