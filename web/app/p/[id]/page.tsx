import { CONDITION_LABEL, RENTAL_PERIOD_LABEL, type ListingItem } from '@bara/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ItemDetail, type ItemDetailProps } from '@/components/ItemDetail/ItemDetail';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { getCurrentUser, getSessionToken } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

const getListing = cache(async (id: string) => {
  const res = await apiFetch<ListingItem>(`/listings/${encodeURIComponent(id)}`);
  if (res.ok) return res.data;
  if (res.status === 404 || res.status === 400) notFound();
  throw new Error(`No se pudo cargar la publicación (${res.status})`);
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const l = await getListing((await params).id);
  const description = l.description.slice(0, 160);
  return {
    title: `${l.title} · Bara Bara`,
    description,
    alternates: { canonical: `/p/${l.id}` },
    openGraph: { type: 'website', title: l.title, description, images: l.images.slice(0, 1) },
    // Pausadas o cerradas: visibles para quien tenga el enlace, pero fuera de Google.
    ...(l.status !== 'ACTIVE' && { robots: { index: false } }),
  };
}

export default async function ListingPage({ params }: Params) {
  const l = await getListing((await params).id);
  const viewer = await getCurrentUser();
  // ¿Ya está en sus Guardados? (solo con sesión)
  const savedKeys = viewer ? await apiFetch<string[]>('/saved/keys', { token: await getSessionToken() }) : null;
  const saved = savedKeys?.ok ? savedKeys.data.includes(`L:${l.id}`) : false;

  const facts: ItemDetailProps['facts'] = [
    { label: 'Categoría', value: l.category },
    { label: 'Estado', value: CONDITION_LABEL[l.condition] },
  ];
  let price: string | undefined;
  let priceSuffix: string | undefined;

  if (l.type === 'SALE' && l.price != null) price = formatMoney(l.price);
  if (l.type === 'RENT' && l.rentalRate != null) {
    price = formatMoney(l.rentalRate);
    priceSuffix = l.rentalPeriod ? RENTAL_PERIOD_LABEL[l.rentalPeriod].suffix : undefined;
    facts.push({ label: 'Depósito', value: l.deposit ? formatMoney(l.deposit) : 'Sin depósito' });
  }
  if (l.type === 'BARTER') {
    facts.push({ label: 'Acepta servicios', value: l.acceptsServices ? 'Sí' : 'Solo objetos' });
  }

  return (
    <ItemDetail
      kind={l.type}
      title={l.title}
      images={l.images}
      price={price}
      priceSuffix={priceSuffix}
      commissionBase={l.type === 'RENT' ? l.rentalRate : l.price}
      facts={facts}
      wants={l.type === 'BARTER' ? l.barterWants : undefined}
      description={l.description}
      neighborhood={l.neighborhood}
      person={l.owner}
      personRole={l.type === 'RENT' ? 'Lo renta' : l.type === 'BARTER' ? 'Lo intercambia' : 'Lo vende'}
      createdAt={l.createdAt}
      saved={saved}
      status={l.status}
      closeLabel={l.type === 'SALE' ? 'Vendida' : l.type === 'RENT' ? 'Ya no la rento' : 'Intercambiada'}
      negotiate={{
        target: { listingId: l.id },
        back: `/p/${l.id}`,
        viewer: !viewer ? 'guest' : viewer.id === l.ownerId ? 'owner' : 'neighbor',
      }}
    />
  );
}
