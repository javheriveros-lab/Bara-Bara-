import { PROHIBITED_CONTENT_CODE, PROHIBITED_CONTENT_MESSAGE } from '@bara/shared';
import { errorMessage, type ApiResult } from './api';

/** Estado que devuelven las Server Actions de formularios. */
export interface FormState {
  message?: string;
  fields?: Record<string, string>;
  /** Para no vaciar el formulario al fallar (nunca incluye contraseñas). */
  values?: Record<string, string>;
  /** Mensaje de éxito (cuando la acción no redirige). */
  ok?: string;
}

/** Traduce un error de la API a errores de formulario (por campo cuando se puede). */
export function toFormState(res: Extract<ApiResult<unknown>, { ok: false }>, values: Record<string, string>): FormState {
  // Moderación: aviso general arriba y el motivo en cada campo afectado.
  if (res.error.code === PROHIBITED_CONTENT_CODE) {
    return { values, message: PROHIBITED_CONTENT_MESSAGE, fields: res.error.fields };
  }
  if (res.status === 429) return { values, message: 'Demasiados intentos. Espera un minuto y vuelve a probar.' };
  if (res.status === 409) return { values, fields: { email: errorMessage(res.error) } };
  if (res.status === 400 && res.error.fields) return { values, fields: res.error.fields };
  return { values, message: errorMessage(res.error) };
}
