import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

/**
 * Se aplica sobre el campo discriminador (p. ej. `type`) y rechaza los campos
 * que pertenecen a OTRO valor del discriminador.
 *
 * Ejemplo: con `{ SALE: ['price'], RENT: ['rentalRate'] }`, un body con
 * `type: 'SALE'` y `rentalRate` falla con "rentalRate no aplica a SALE".
 *
 * Complementa a `@ValidateIf(o => o.type === X)`, que solo hace obligatorios los
 * campos propios; class-validator no permite combinar "requerido si" y
 * "prohibido si no" sobre la misma propiedad.
 */
export function OnlyFieldsFor<D extends string>(
  fieldsByValue: Record<D, readonly string[]>,
  options?: ValidationOptions,
) {
  const allFields = [...new Set(Object.values<readonly string[]>(fieldsByValue).flat())];

  const foreignFields = (args: ValidationArguments) => {
    const allowed = fieldsByValue[args.value as D] ?? [];
    const obj = args.object as Record<string, unknown>;
    return allFields.filter((f) => !allowed.includes(f) && obj[f] !== undefined);
  };

  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'onlyFieldsFor',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate: (_value: unknown, args: ValidationArguments) => foreignFields(args).length === 0,
        defaultMessage: (args: ValidationArguments) =>
          `${foreignFields(args).join(', ')} no aplica a ${args.property} ${String(args.value)}`,
      },
    });
  };
}
