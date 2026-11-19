import { findProhibitedFields, PROHIBITED_CONTENT_MESSAGE, prohibitedFieldMessage } from '@bara/shared';
import type { FormState } from './form-state';

/** Campos de texto libre que se revisan al publicar (la API aplica la misma regla). */
export const MODERATED_FIELDS = ['title', 'description', 'category', 'barterWants'] as const;

/**
 * Aviso inmediato antes de enviar: mismo filtro que la API (packages/shared/src/moderation.ts).
 * null si todo está bien.
 */
export function moderationState(values: Record<string, string>): FormState | null {
  const hits = findProhibitedFields(Object.fromEntries(MODERATED_FIELDS.map((f) => [f, values[f]])));
  const entries = Object.entries(hits);
  if (!entries.length) return null;
  return {
    values,
    message: PROHIBITED_CONTENT_MESSAGE,
    fields: Object.fromEntries(entries.map(([field, category]) => [field, prohibitedFieldMessage(category!)])),
  };
}
