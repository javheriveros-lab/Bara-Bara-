import { PRICING_MODEL_LABEL, SERVICE_CATEGORY_LABEL, type ServiceItem } from '@bara/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ItemDetail, type ItemDetailProps } from '@/components/ItemDetail/ItemDetail';
import { apiFetch } from '@/lib/api';
import { formatAvailability, formatMoney } from '@/lib/format';
import { getCurrentUser, getSessionToken } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

const getService = cache(async (id: string) => {
  const res = await apiFetch<ServiceItem>(`/services/${encodeURIComponent(id)}`);
  if (res.ok) return res.data;
  if (res.status === 404 || res.status === 400) notFound();
  throw new Error(`No se pudo cargar el servicio (${res.status})`);
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = await getService((await params).id);
  const description = s.description.slice(0, 160);
  return {
    title: `${s.title} · Bara Bara`,
    description,
    alternates: { canonical: `/s/${s.id}` },
    openGraph: { type: 'website', title: s.title, description, images: (s.images ?? []).slice(0, 1) },
    ...(s.status !== 'ACTIVE' && { robots: { index: false } }),
  };
}

export default async function ServicePage({ params }: Params) {
  const s = await getService((await params).id);
  const viewer = await getCurrentUser();
  // ¿Ya está en sus Guardados? (solo con sesión)
  const savedKeys = viewer ? await apiFetch<string[]>('/saved/keys', { token: await getSessionToken() }) : null;
  const saved = savedKeys?.ok ? savedKeys.data.includes(`S:${s.id}`) : false;

  const quote = s.pricingModel === 'QUOTE' || s.basePrice == null;
  const facts: ItemDetailProps['facts'] = [
    { label: 'Oficio', value: SERVICE_CATEGORY_LABEL[s.category] },
    { label: 'Cobro', value: PRICING_MODEL_LABEL[s.pricingModel].label },
    { label: 'Cobertura', value: `${s.coverageRadiusKm} km a la redonda` },
  ];
  const availability = formatAvailability(s.availability);
  if (availability) facts.push({ label: 'Horario', value: availability });

  return (
    <ItemDetail
      kind="SERVICE"
      title={s.title}
      images={s.images ?? []}
      price={quote ? 'A cotizar' : formatMoney(s.basePrice!)}
      priceSuffix={!quote && s.pricingModel === 'HOURLY' ? '/hora' : undefined}
      commissionBase={quote ? null : s.basePrice}
      facts={facts}
      description={s.description}
      neighborhood={s.neighborhood}
      person={s.provider}
      personRole="Ofrece el servicio"
      createdAt={s.createdAt}
      saved={saved}
      status={s.status}
      closeLabel="Ya no lo ofrezco"
      negotiate={{
        target: { serviceId: s.id },
        back: `/s/${s.id}`,
        viewer: !viewer ? 'guest' : viewer.id === s.providerId ? 'owner' : 'neighbor',
      }}
    />
  );
}
