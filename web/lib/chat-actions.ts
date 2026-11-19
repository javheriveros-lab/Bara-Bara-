'use server';

import type { ChatMessage, ConversationDetail } from '@bara/shared';
import { redirect } from 'next/navigation';
import { apiFetch, errorMessage } from './api';
import { safeNext } from './safe-next';
import { getClientIp, getSessionToken } from './session';

/** "Negociar": abre (o reutiliza) la conversación y lleva a la sala. Funciona sin JS. */
export async function startConversationAction(form: FormData) {
  const back = safeNext(form.get('back')) ?? '/';
  const listingId = String(form.get('listingId') ?? '') || undefined;
  const serviceId = String(form.get('serviceId') ?? '') || undefined;

  const token = await getSessionToken();
  if (!token) redirect(`/entrar?next=${encodeURIComponent(back)}`);

  const res = await apiFetch<ConversationDetail>('/conversations', {
    method: 'POST',
    body: listingId ? { listingId } : { serviceId },
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) {
    if (res.status === 401) redirect(`/entrar?next=${encodeURIComponent(back)}`);
    throw new Error(errorMessage(res.error));
  }
  redirect(`/mensajes/${res.data.id}`);
}

/**
 * Token de 2 minutos para el handshake del socket. El navegador lo pide en cada
 * (re)conexión; el token de sesión sigue sin salir de la cookie httpOnly.
 */
export async function getSocketTokenAction(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const res = await apiFetch<{ token: string }>('/auth/socket-token', { method: 'POST', token, clientIp: await getClientIp() });
  return res.ok ? res.data.token : null;
}

/** Puesta al día tras (re)conectar: lo que llegó mientras no había socket. */
export async function loadNewerMessagesAction(conversationId: string, after: string): Promise<ChatMessage[] | null> {
  const token = await getSessionToken();
  if (!token || !/^[a-f0-9]{24}$/i.test(conversationId)) return null;
  const res = await apiFetch<ChatMessage[]>(
    `/conversations/${conversationId}/messages?take=100&after=${encodeURIComponent(after)}`,
    { token },
  );
  return res.ok ? res.data : null;
}

/** Página anterior del historial (los más recientes primero). */
export async function loadOlderMessagesAction(conversationId: string, before: string): Promise<ChatMessage[] | null> {
  const token = await getSessionToken();
  if (!token || !/^[a-f0-9]{24}$/i.test(conversationId)) return null;
  const res = await apiFetch<ChatMessage[]>(
    `/conversations/${conversationId}/messages?take=50&before=${encodeURIComponent(before)}`,
    { token },
  );
  return res.ok ? res.data : null;
}
