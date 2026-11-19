'use server';

import type { AuthResponse } from '@bara/shared';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { toFormState, type FormState } from './form-state';
import { clearSessionCookie, getClientIp, setSessionCookie } from './session';
import { safeNext } from './safe-next';

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: text(form, 'email') };
  const res = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { ...values, password: String(form.get('password') ?? '') },
    clientIp: await getClientIp(),
  });
  if (!res.ok) return toFormState(res, values);

  await setSessionCookie(res.data.accessToken);
  redirect(safeNext(form.get('next')) ?? '/');
}

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = {
    displayName: text(form, 'displayName'),
    email: text(form, 'email'),
    neighborhood: text(form, 'neighborhood'),
  };
  if (form.get('acceptTerms') !== 'on') {
    return { values, fields: { acceptTerms: 'Para crear tu cuenta acepta los términos y el aviso de privacidad' } };
  }
  const res = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: {
      displayName: values.displayName,
      email: values.email,
      password: String(form.get('password') ?? ''),
      // Opcional: vacío no se envía (el backend exige 2–80 caracteres si viene).
      ...(values.neighborhood && { neighborhood: values.neighborhood }),
      acceptTerms: true,
    },
    clientIp: await getClientIp(),
  });
  if (!res.ok) return toFormState(res, values);

  await setSessionCookie(res.data.accessToken);
  redirect(safeNext(form.get('next')) ?? '/');
}

/** Siempre responde lo mismo, exista o no el correo. */
export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: text(form, 'email') };
  if (!values.email) return { values, fields: { email: 'Escribe tu email' } };
  const res = await apiFetch('/auth/forgot', { method: 'POST', body: values, clientIp: await getClientIp() });
  if (!res.ok) return toFormState(res, values);
  return { values, ok: 'Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también tu spam.' };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = text(form, 'token');
  const password = String(form.get('password') ?? '');
  if (password !== String(form.get('confirm') ?? '')) return { fields: { confirm: 'Las contraseñas no coinciden' } };
  const res = await apiFetch('/auth/reset', { method: 'POST', body: { token, password }, clientIp: await getClientIp() });
  if (!res.ok) return toFormState(res, {});
  redirect('/entrar?reset=1');
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect('/');
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}
