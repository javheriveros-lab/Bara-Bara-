import type { CardKind } from '@bara/shared';

// ── Navegación principal: 4 pilares ──

export type FeedSlug = 'venta' | 'renta' | 'intercambio' | 'servicios';

/** Barra superior y filtros de búsqueda (`/buscar?tipo=`): un pilar por tipo de publicación. */
export const FEED_FILTERS: { slug: FeedSlug; label: string; kinds: CardKind[] }[] = [
  { slug: 'venta', label: 'Venta', kinds: ['SALE'] },
  { slug: 'renta', label: 'Renta', kinds: ['RENT'] },
  { slug: 'intercambio', label: 'Intercambio', kinds: ['BARTER'] },
  { slug: 'servicios', label: 'Servicios', kinds: ['SERVICE'] },
];

/** Enlaces viejos (`?tipo=venta-y-renta`, `trueque`, `chamba`) siguen funcionando. */
const LEGACY_FEED: Record<string, FeedSlug> = {
  'venta-y-renta': 'venta',
  trueque: 'intercambio',
  chamba: 'servicios',
};

export function feedFilterFromSlug(slug: unknown) {
  if (typeof slug !== 'string') return undefined;
  const key = LEGACY_FEED[slug] ?? slug;
  return FEED_FILTERS.find((f) => f.slug === key);
}

/** Sección a la que pertenece un tipo (para etiquetar los mosaicos de /publicar). */
export const sectionOf = (kind: CardKind) => FEED_FILTERS.find((f) => f.kinds.includes(kind))!;

// ── Publicar: un formulario por tipo ──

/** `/publicar?tipo=` en español. */
export const KIND_BY_SLUG = {
  venta: 'SALE',
  renta: 'RENT',
  intercambio: 'BARTER',
  servicio: 'SERVICE',
} as const satisfies Record<string, CardKind>;

export type KindSlug = keyof typeof KIND_BY_SLUG;

const LEGACY_KIND: Record<string, KindSlug> = { trueque: 'intercambio', chamba: 'servicio' };

export function kindFromSlug(slug: unknown): CardKind | undefined {
  if (typeof slug !== 'string') return undefined;
  const key = LEGACY_KIND[slug] ?? slug;
  return key in KIND_BY_SLUG ? KIND_BY_SLUG[key as KindSlug] : undefined;
}

export const SLUG_BY_KIND: Record<CardKind, KindSlug> = {
  SALE: 'venta',
  RENT: 'renta',
  BARTER: 'intercambio',
  SERVICE: 'servicio',
};
