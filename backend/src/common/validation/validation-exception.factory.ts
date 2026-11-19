import { BadRequestException, type ValidationError } from '@nestjs/common';
import { PROHIBITED_CONTENT_CODE, PROHIBITED_CONTENT_MESSAGE } from '../moderation/moderation';
import { PROHIBITED_CONSTRAINT } from '../moderation/no-prohibited-content.decorator';

/**
 * Respuesta 400 que los formularios pueden pintar campo por campo:
 * `{ statusCode, error, message: string[], fields: { email: '…', 'address.street': '…' } }`.
 * `message` se conserva para clientes que solo muestran una lista.
 * Con términos prohibidos se agrega `code: 'PROHIBITED_CONTENT'` y el aviso general va primero.
 */
export function validationExceptionFactory(errors: ValidationError[]) {
  const fields: Record<string, string> = {};
  const prohibited = collect(errors, '', fields);

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    ...(prohibited && { code: PROHIBITED_CONTENT_CODE }),
    message: prohibited ? [PROHIBITED_CONTENT_MESSAGE, ...Object.values(fields)] : Object.values(fields),
    fields,
  });
}

/** Llena `out` y devuelve si algún campo tiene contenido prohibido. */
function collect(errors: ValidationError[], prefix: string, out: Record<string, string>): boolean {
  let prohibited = false;
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    const first = Object.values(e.constraints ?? {})[0];
    if (first) out[path] = toSpanish(first);
    if (e.constraints?.[PROHIBITED_CONSTRAINT]) prohibited = true;
    if (e.children?.length && collect(e.children, path, out)) prohibited = true;
  }
  return prohibited;
}

const money = (n: string) => Number(n).toLocaleString('es-MX');

/**
 * Traduce los mensajes por defecto de class-validator (en inglés y con el nombre
 * interno del campo). Los mensajes propios en español no coinciden y pasan tal cual.
 */
const RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/should not exist$/, () => 'Este campo no está permitido'],
  [/must be longer than or equal to (\d+) characters/, (m) => `Debe tener al menos ${m[1]} caracteres`],
  [/must be shorter than or equal to (\d+) characters/, (m) => `Debe tener como máximo ${m[1]} caracteres`],
  [/must not be less than (-?[\d.]+)/, (m) => `Debe ser al menos ${money(m[1])}`],
  [/must not be greater than (-?[\d.]+)/, (m) => `No puede ser mayor que ${money(m[1])}`],
  [/must be a number/, () => 'Escribe un número válido (máximo 2 decimales)'],
  [/must be an integer/, () => 'Escribe un número entero'],
  [/must contain at least (\d+) elements/, (m) => `Agrega al menos ${m[1]}`],
  [/must contain no more than (\d+) elements/, (m) => `Máximo ${m[1]} elementos`],
  [/must be a URL address/, () => 'Enlace inválido'],
  [/must be one of the following values|must be a valid enum value/, () => 'Elige una opción válida'],
  [/must be an email/, () => 'Email inválido'],
  [/must be a boolean/, () => 'Valor inválido'],
  [/must be an array/, () => 'Debe ser una lista'],
  [/must be a string/, () => 'Debe ser texto'],
  [/should not be (empty|null or undefined)/, () => 'Este campo es obligatorio'],
];

function toSpanish(message: string): string {
  for (const [pattern, translate] of RULES) {
    const m = message.match(pattern);
    if (m) return translate(m);
  }
  return message;
}
