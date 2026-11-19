'use server';

import type { Deal } from '@bara/shared';
import { apiFetch, errorMessage } from './api';
import { getClientIp, getSessionToken } from './session';

export type DealActionResult = { ok: true; deal: Deal } | { ok: false; message: string };

const isId = (id: string) => /^[a-f0-9]{24}$/i.test(id);

async function dealCall(path: string, body?: unknown): Promise<DealActionResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, message: 'Tu sesión expiró. Vuelve a entrar.' };
  const res = await apiFetch<Deal>(path, { method: 'POST', body, token, clientIp: await getClientIp() });
  if (res.ok) return { ok: true, deal: res.data };
  if (res.status === 400 && res.error.fields) return { ok: false, message: Object.values(res.error.fields)[0] };
  return { ok: false, message: errorMessage(res.error) };
}

/** El vendedor/prestador propone cerrar con el precio acordado (sin monto en trueque). */
export async function proposeDealAction(conversationId: string, amount?: number): Promise<DealActionResult> {
  if (!isId(conversationId)) return { ok: false, message: 'Conversación inválida' };
  return dealCall(`/conversations/${conversationId}/deal`, amount === undefined ? {} : { amount });
}

export async function confirmDealAction(dealId: string): Promise<DealActionResult> {
  if (!isId(dealId)) return { ok: false, message: 'Trato inválido' };
  return dealCall(`/deals/${dealId}/confirm`);
}

export async function cancelDealAction(dealId: string): Promise<DealActionResult> {
  if (!isId(dealId)) return { ok: false, message: 'Trato inválido' };
  return dealCall(`/deals/${dealId}/cancel`);
}
