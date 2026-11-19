import type { ListingItem, ServiceItem } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PublishForm } from '@/components/PublishForm/PublishForm';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import styles from '../../publicar.module.css';

export const metadata: Metadata = { title: 'Editar publicación · Bara Bara', robots: { index: false } };

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

export default async function EditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const [{ id }, { tipo }] = await Promise.all([params, searchParams]);
  const isService = tipo === 's';
  const self = `/publicar/editar/${id}${isService ? '?tipo=s' : ''}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(self)}`);
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();

  const [item, uploads] = await Promise.all([
    isService ? apiFetch<ServiceItem>(`/services/${id}`) : apiFetch<ListingItem>(`/listings/${id}`),
    apiFetch<{ enabled: boolean }>('/uploads/status'),
  ]);
  if (!item.ok) notFound();

  let kind: 'SALE' | 'RENT' | 'BARTER' | 'SERVICE';
  let initial: Record<string, string>;
  if (isService) {
    const s = item.data as ServiceItem;
    if (s.providerId !== user.id) notFound();
    kind = 'SERVICE';
    initial = {
      title: s.title,
      description: s.description,
      category: s.category,
      neighborhood: s.neighborhood,
      pricingModel: s.pricingModel,
      basePrice: str(s.basePrice),
      coverageRadiusKm: String(s.coverageRadiusKm),
    };
  } else {
    const l = item.data as ListingItem;
    if (l.ownerId !== user.id) notFound();
    kind = l.type;
    initial = {
      title: l.title,
      description: l.description,
      category: l.category,
      condition: l.condition,
      neighborhood: l.neighborhood,
      price: str(l.price),
      rentalRate: str(l.rentalRate),
      rentalPeriod: l.rentalPeriod ?? '',
      deposit: str(l.deposit),
      barterWants: l.barterWants.join(', '),
      acceptsServices: l.acceptsServices ? 'on' : '',
    };
  }

  return (
    <main className={styles.main}>
      <Link href="/perfil/publicaciones" className={styles.back}>
        ← Mis publicaciones
      </Link>
      <div className={styles.card}>
        <header className={styles.hero}>
          <div>
            <h1>Editar publicación</h1>
            <p>Los cambios se ven al instante en la comunidad.</p>
          </div>
        </header>
        <PublishForm
          kind={kind}
          editId={id}
          initial={initial}
          initialImages={item.data.images ?? []}
          uploadsEnabled={uploads.ok && uploads.data.enabled}
        />
      </div>
    </main>
  );
}
