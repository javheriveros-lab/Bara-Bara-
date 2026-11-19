'use server';

import type { PaymentInstructions, UploadSignature } from '@bara/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, errorMessage } from './api';
import { toFormState, type FormState } from './form-state';
import { getClientIp, getSessionToken } from './session';

type SignatureResult = { ok: true; signature: UploadSignature } | { ok: false; message: string };

/** Firma para subir a la carpeta privada del vecino: INE/domicilio (kyc) o comprobante de pago. */
export async function getPrivateSignatureAction(purpose: 'kyc' | 'payment'): Promise<SignatureResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, message: 'Tu sesión expiró. Vuelve a entrar.' };
  const path = purpose === 'kyc' ? '/verification/signature' : '/commissions/proof-signature';
  const res = await apiFetch<UploadSignature>(path, { method: 'POST', token, clientIp: await getClientIp() });
  if (res.ok) return { ok: true, signature: res.data };
  if (res.status === 429) return { ok: false, message: 'Demasiados intentos. Espera un minuto.' };
  return { ok: false, message: errorMessage(res.error) };
}

/** "<campo>.fileId" (input oculto que llena PrivateUpload). */
function uploadField(form: FormData, name: string) {
  const fileId = String(form.get(`${name}.fileId`) ?? '');
  return fileId ? { fileId } : undefined;
}

async function requireToken(next: string) {
  const token = await getSessionToken();
  if (!token) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return token;
}

// ─────────────── Verificación ───────────────

const DOC_FIELDS = {
  ineFront: 'Sube el frente de tu INE',
  ineBack: 'Sube el reverso de tu INE',
  proofOfAddress: 'Sube tu comprobante de domicilio',
} as const;

export async function submitVerificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = await requireToken('/perfil/verificacion');
  const docs = Object.fromEntries(Object.keys(DOC_FIELDS).map((k) => [k, uploadField(form, k)]));
  const missing = Object.entries(DOC_FIELDS).filter(([k]) => !docs[k]);
  const fields: Record<string, string> = Object.fromEntries(missing);
  if (form.get('kycConsent') !== 'on') fields.kycConsent = 'Necesitamos tu autorización para revisar tus documentos';
  if (Object.keys(fields).length) return { fields };

  const res = await apiFetch('/verification', { method: 'POST', body: { ...docs, kycConsent: true }, token, clientIp: await getClientIp() });
  if (!res.ok) {
    if (res.status === 400 && res.error.fields) {
      // "ineFront.publicId" → "ineFront"
      const fields = Object.fromEntries(Object.entries(res.error.fields).map(([k, v]) => [k.split('.')[0], v]));
      return { fields };
    }
    if (res.status === 429) return { message: 'Demasiados intentos. Espera un minuto y vuelve a probar.' };
    return { message: errorMessage(res.error) };
  }
  revalidatePath('/perfil', 'layout');
  redirect('/perfil/verificacion');
}

// ─────────────── Comisiones ───────────────

/** Genera (o reutiliza) la referencia SPEI. Funciona sin JS: vuelve a la página de comisiones. */
export async function createPaymentAction(_prev: FormState): Promise<FormState> {
  const token = await requireToken('/perfil/comisiones');
  const res = await apiFetch<PaymentInstructions>('/commissions/payments', {
    method: 'POST',
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) return { message: errorMessage(res.error) };
  revalidatePath('/perfil', 'layout');
  redirect('/perfil/comisiones');
}

export async function submitProofAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = await requireToken('/perfil/comisiones');
  const paymentId = String(form.get('paymentId') ?? '');
  const proof = uploadField(form, 'proof');
  if (!/^[a-f0-9]{24}$/i.test(paymentId)) return { message: 'Referencia inválida' };
  if (!proof) return { fields: { proof: 'Sube la foto o PDF de tu comprobante' } };

  const res = await apiFetch(`/commissions/payments/${paymentId}/proof`, {
    method: 'POST',
    body: proof,
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) return { message: errorMessage(res.error) };
  revalidatePath('/perfil', 'layout');
  redirect('/perfil/comisiones');
}

// ─────────────── Revisión (admin) ───────────────

async function adminCall(path: string, body?: unknown): Promise<FormState> {
  const token = await requireToken('/admin');
  const res = await apiFetch(path, { method: 'POST', body, token, clientIp: await getClientIp() });
  if (!res.ok) {
    if (res.status === 400 && res.error.fields) return { fields: { note: Object.values(res.error.fields)[0] } };
    return { message: errorMessage(res.error) };
  }
  revalidatePath('/admin');
  return { message: 'Listo' };
}

const validId = (v: FormDataEntryValue | null) => (typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v) ? v : null);

export async function reviewVerificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const userId = validId(form.get('userId'));
  if (!userId) return { message: 'Solicitud inválida' };
  return form.get('decision') === 'approve'
    ? adminCall(`/admin/verifications/${userId}/approve`)
    : adminCall(`/admin/verifications/${userId}/reject`, { note: String(form.get('note') ?? '') });
}

export async function reviewPaymentAction(_prev: FormState, form: FormData): Promise<FormState> {
  const paymentId = validId(form.get('paymentId'));
  if (!paymentId) return { message: 'Pago inválido' };
  return form.get('decision') === 'approve'
    ? adminCall(`/admin/payments/${paymentId}/approve`)
    : adminCall(`/admin/payments/${paymentId}/reject`, { note: String(form.get('note') ?? '') });
}

// ─────────────── Perfil ───────────────

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = await requireToken('/perfil/editar');
  const values = {
    displayName: String(form.get('displayName') ?? '').trim(),
    neighborhood: String(form.get('neighborhood') ?? '').trim(),
  };
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    body: { displayName: values.displayName, neighborhood: values.neighborhood || null },
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) return toFormState(res, values);
  revalidatePath('/', 'layout');
  return { values, ok: 'Guardamos tus cambios.' };
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = await requireToken('/perfil/editar');
  const newPassword = String(form.get('newPassword') ?? '');
  if (newPassword !== String(form.get('confirm') ?? '')) return { fields: { confirm: 'Las contraseñas no coinciden' } };
  const res = await apiFetch('/users/me/password', {
    method: 'POST',
    body: { currentPassword: String(form.get('currentPassword') ?? ''), newPassword },
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) {
    if (res.status === 401) return { fields: { currentPassword: 'La contraseña actual no es correcta' } };
    return toFormState(res, {});
  }
  return { ok: 'Tu contraseña cambió.' };
}

// ─────────────── Mis publicaciones ───────────────

export type OwnerStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

/** Pausar, reactivar, cerrar o borrar una publicación (kind "p") o servicio (kind "s"). */
export async function ownerItemAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = await requireToken('/perfil/publicaciones');
  const id = validId(form.get('id'));
  const kind = form.get('kind') === 's' ? 'services' : 'listings';
  const op = String(form.get('op') ?? '');
  if (!id) return { message: 'Publicación inválida' };
  const clientIp = await getClientIp();
  const res =
    op === 'delete'
      ? await apiFetch(`/${kind}/${id}`, { method: 'DELETE', token, clientIp })
      : ['ACTIVE', 'PAUSED', 'CLOSED'].includes(op)
        ? await apiFetch(`/${kind}/${id}/status`, { method: 'POST', body: { status: op }, token, clientIp })
        : null;
  if (!res) return { message: 'Acción inválida' };
  if (!res.ok) return { message: errorMessage(res.error) };
  revalidatePath('/', 'layout');
  return {};
}

// ─────────────── Reportes ───────────────

export async function reportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const id = validId(form.get('id'));
  const kind = form.get('kind') === 's' ? 's' : 'p';
  const token = await requireToken(`/${kind}/${id ?? ''}`);
  if (!id) return { message: 'Publicación inválida' };
  const reason = String(form.get('reason') ?? '');
  if (!['PROHIBITED', 'SCAM', 'OFFENSIVE', 'OTHER'].includes(reason)) return { fields: { reason: 'Elige un motivo' } };
  const note = String(form.get('note') ?? '').trim();
  const res = await apiFetch('/reports', {
    method: 'POST',
    body: { [kind === 's' ? 'serviceId' : 'listingId']: id, reason, ...(note && { note }) },
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) {
    if (res.status === 429) return { message: 'Ya enviaste varios reportes. Intenta más tarde.' };
    return { message: errorMessage(res.error) };
  }
  return { ok: 'Gracias. Lo revisamos pronto.' };
}

// ─────────────── Moderación (admin) ───────────────

export async function reviewReportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const reportId = validId(form.get('reportId'));
  const userId = validId(form.get('userId'));
  switch (form.get('decision')) {
    case 'remove':
      return reportId ? adminCall(`/admin/reports/${reportId}/remove`) : { message: 'Reporte inválido' };
    case 'dismiss':
      return reportId ? adminCall(`/admin/reports/${reportId}/dismiss`) : { message: 'Reporte inválido' };
    case 'suspend':
      return userId
        ? adminCall(`/admin/users/${userId}/suspend`, { note: String(form.get('note') ?? '') })
        : { message: 'Usuario inválido' };
    case 'unsuspend':
      return userId ? adminCall(`/admin/users/${userId}/unsuspend`) : { message: 'Usuario inválido' };
    default:
      return { message: 'Acción inválida' };
  }
}
