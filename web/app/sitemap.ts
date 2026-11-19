import type { ListingItem, ServiceItem } from '@bara/shared';
import type { MetadataRoute } from 'next';
import { apiFetch } from '@/lib/api';
import { SITE_URL } from '@/lib/env';

// Se arma en cada visita del buscador (pocas al día): siempre refleja lo que está activo.
export const dynamic = 'force-dynamic';

const PAGE = 50; // máximo que acepta la API por llamada
const MAX_PAGES = 20; // hasta 1,000 de cada tipo: suficiente para el arranque

async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await apiFetch<T[]>(`${path}?take=${PAGE}&skip=${i * PAGE}`);
    if (!res.ok) break;
    out.push(...res.data);
    if (res.data.length < PAGE) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, services] = await Promise.all([all<ListingItem>('/listings'), all<ServiceItem>('/services')]);
  const fixed = ['', '/buscar?tipo=venta', '/buscar?tipo=renta', '/buscar?tipo=intercambio', '/buscar?tipo=servicios'];

  return [
    ...fixed.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'daily' as const, priority: p ? 0.8 : 1 })),
    ...['/terminos', '/privacidad', '/contacto'].map((p) => ({ url: `${SITE_URL}${p}`, priority: 0.2 })),
    ...listings.map((l) => ({ url: `${SITE_URL}/p/${l.id}`, lastModified: l.updatedAt, priority: 0.6 })),
    ...services.map((s) => ({ url: `${SITE_URL}/s/${s.id}`, lastModified: s.updatedAt, priority: 0.6 })),
  ];
}
