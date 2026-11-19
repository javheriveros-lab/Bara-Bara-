'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, errorMessage } from './api';
import { getSessionToken } from './session';

export type SavedKind = 'listing' | 'service';
export type SaveResult = { ok: true; saved: boolean } | { ok: false; message: string };

const isId = (id: string) => /^[a-f0-9]{24}$/i.test(id);

/** Guarda o quita una publicación de "Guardados" (el carrito de Bara Bara). */
export async function toggleSavedAction(kind: SavedKind, id: string, save: boolean): Promise<SaveResult> {
  if ((kind !== 'listing' && kind !== 'service') || !isId(id)) return { ok: false, message: 'Publicación inválida' };
  const token = await getSessionToken();
  if (!token) return { ok: false, message: 'Entra a tu cuenta para guardar.' };
  const res = save
    ? await apiFetch<{ saved: boolean }>('/saved', { method: 'POST', body: { kind, id }, token })
    : await apiFetch<{ saved: boolean }>(`/saved/${kind}/${id}`, { method: 'DELETE', token });
  if (!res.ok) return { ok: false, message: errorMessage(res.error) };
  revalidatePath('/guardados');
  return { ok: true, saved: res.data.saved };
}

/** Formulario de "Quitar" en la página de guardados (funciona sin JS). */
export async function removeSavedFormAction(formData: FormData): Promise<void> {
  const kind = String(formData.get('kind')) as SavedKind;
  const id = String(formData.get('id'));
  await toggleSavedAction(kind, id, false);
}
