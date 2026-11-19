'use server';

import type { ListingItem, ListingType, ServiceItem, UploadSignature } from '@bara/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, errorMessage } from './api';
import { toFormState, type FormState } from './form-state';
import { SLUG_BY_KIND } from './kinds';
import { moderationState } from './moderation';
import { getClientIp, getSessionToken } from './session';

const LISTING_TYPES: readonly ListingType[] = ['SALE', 'RENT', 'BARTER'];

export async function createListingAction(_prev: FormState, form: FormData): Promise<FormState> {
  return saveListing(form);
}

export async function updateListingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const id = objectId(form);
  return id ? saveListing(form, id) : { message: 'Publicación inválida.' };
}

export async function createServiceAction(_prev: FormState, form: FormData): Promise<FormState> {
  return saveService(form);
}

export async function updateServiceAction(_prev: FormState, form: FormData): Promise<FormState> {
  const id = objectId(form);
  return id ? saveService(form, id) : { message: 'Servicio inválido.' };
}

/** Crea (sin id) o edita (con id) una publicación de venta, renta o intercambio. */
async function saveListing(form: FormData, id?: string): Promise<FormState> {
  const type = String(form.get('type')) as ListingType;
  if (!LISTING_TYPES.includes(type)) return { message: 'Tipo de publicación inválido.' };
  const token = await requireToken(type);

  const values = read(form, [
    'title', 'description', 'category', 'condition', 'neighborhood',
    'price', 'rentalRate', 'rentalPeriod', 'deposit', 'barterWants',
  ]);
  // Sin JS el formulario llega directo aquí: se revisa antes de llamar a la API (que revisa otra vez).
  const blocked = moderationState(values);
  if (blocked) return blocked;

  const body: Record<string, unknown> = {
    type,
    title: values.title,
    description: values.description,
    category: values.category,
    neighborhood: values.neighborhood,
    ...(values.condition && { condition: values.condition }),
    images: images(form),
  };
  // Solo se envían los campos del tipo elegido (el backend rechaza los ajenos).
  if (type === 'SALE') body.price = money(values.price);
  if (type === 'RENT') {
    body.rentalRate = money(values.rentalRate);
    body.rentalPeriod = values.rentalPeriod || undefined;
    body.deposit = money(values.deposit);
  }
  if (type === 'BARTER') {
    body.barterWants = values.barterWants.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    body.acceptsServices = form.get('acceptsServices') === 'on';
  }

  const res = await apiFetch<ListingItem>(id ? `/listings/${id}` : '/listings', {
    method: id ? 'PUT' : 'POST',
    body,
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) {
    if (res.status === 401) redirect(loginUrl(type));
    return friendlyChoice(toFormState(res, values), values, 'Elige una categoría');
  }
  if (id) revalidatePath('/', 'layout');
  redirect(`/p/${res.data.id}`);
}

async function saveService(form: FormData, id?: string): Promise<FormState> {
  const token = await requireToken('SERVICE');

  const values = read(form, ['title', 'description', 'category', 'neighborhood', 'pricingModel', 'basePrice', 'coverageRadiusKm']);
  const blocked = moderationState(values);
  if (blocked) return blocked;

  const body: Record<string, unknown> = {
    category: values.category,
    title: values.title,
    description: values.description,
    neighborhood: values.neighborhood,
    pricingModel: values.pricingModel,
    ...(values.pricingModel !== 'QUOTE' && { basePrice: money(values.basePrice) }),
    ...(values.coverageRadiusKm && { coverageRadiusKm: Number(values.coverageRadiusKm) }),
    images: images(form),
  };

  const res = await apiFetch<ServiceItem>(id ? `/services/${id}` : '/services', {
    method: id ? 'PUT' : 'POST',
    body,
    token,
    clientIp: await getClientIp(),
  });
  if (!res.ok) {
    if (res.status === 401) redirect(loginUrl('SERVICE'));
    return friendlyChoice(toFormState(res, values), values, 'Elige un oficio');
  }
  if (id) revalidatePath('/', 'layout');
  redirect(`/s/${res.data.id}`);
}

export type SignatureResult = { ok: true; signature: UploadSignature } | { ok: false; message: string };

/** El navegador pide una firma por foto; el token sigue viviendo solo en la cookie httpOnly. */
export async function getUploadSignatureAction(): Promise<SignatureResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, message: 'Tu sesión expiró. Vuelve a entrar.' };
  const res = await apiFetch<UploadSignature>('/uploads/signature', { method: 'POST', token, clientIp: await getClientIp() });
  return res.ok ? { ok: true, signature: res.data } : { ok: false, message: errorMessage(res.error) };
}

// ── helpers ──

async function requireToken(kind: ListingType | 'SERVICE'): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect(loginUrl(kind));
  return token;
}

function loginUrl(kind: ListingType | 'SERVICE') {
  return `/entrar?next=${encodeURIComponent(`/publicar?tipo=${SLUG_BY_KIND[kind]}`)}`;
}

/** Un select sin elegir llega vacío; el mensaje genérico del backend se cambia por uno claro. */
function friendlyChoice(state: FormState, values: Record<string, string>, message: string): FormState {
  if (!values.category && state.fields?.category) state.fields.category = message;
  return state;
}

function read(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? '').trim()]));
}

function images(form: FormData): string[] {
  return form.getAll('images').map(String).filter(Boolean);
}

/**
 * "$1,200.50" → 1200.5. Vacío → undefined (el backend responde "obligatorio").
 * Si no es número se envía tal cual para que el backend devuelva el error del campo.
 */
function money(raw: string): number | string | undefined {
  const clean = raw.replace(/[\s$]/g, '').replace(/,/g, '');
  if (!clean) return undefined;
  const n = Number(clean);
  return Number.isFinite(n) ? n : raw;
}

function objectId(form: FormData): string | null {
  const id = String(form.get('id') ?? '');
  return /^[a-f0-9]{24}$/i.test(id) ? id : null;
}
