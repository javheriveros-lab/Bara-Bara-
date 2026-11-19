import type { ListingItem, ServiceItem } from '@bara/shared';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { HeroCarousel } from '@/components/Home/HeroCarousel';
import { CategoryGrid, ProductRow, ShortcutCards, TrustStrip } from '@/components/Home/HomeSections';
import styles from '@/components/Home/Home.module.css';
import { FeedSkeleton } from '@/components/Loading/ThunderLoader';
import { EmptyStreet } from '@/components/Punk/EmptyStreet';
import { SignalLost } from '@/components/Punk/SignalLost';
import { apiFetch } from '@/lib/api';
import { listingToCard, serviceToCard } from '@/lib/cards';
import { feedFilterFromSlug } from '@/lib/kinds';
import { getCurrentUser } from '@/lib/session';

const ROW = 10;

/**
 * Portada con la distribución de un gran marketplace: carrusel, accesos rápidos, filas de
 * productos por pilar, categorías y franja de confianza. Los pilares viven en /buscar?tipo=.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  // Enlaces viejos (/?tipo=renta…) llevan a la búsqueda del pilar.
  const filter = feedFilterFromSlug((await searchParams).tipo);
  if (filter) redirect(`/buscar?tipo=${filter.slug}`);

  const user = await getCurrentUser();

  return (
    <main className={styles.page}>
      <HeroCarousel />
      <div className={styles.container}>
        <ShortcutCards user={user} />
        <Suspense
          fallback={
            <section className={styles.box} aria-label="Cargando publicaciones">
              <FeedSkeleton count={5} />
            </section>
          }
        >
          <HomeFeed />
        </Suspense>
        <TrustStrip />
      </div>
    </main>
  );
}

/** Una sola consulta de objetos y otra de servicios alimentan todas las filas y las fotos de categorías. */
async function HomeFeed() {
  const [listings, services] = await Promise.all([
    apiFetch<ListingItem[]>('/listings?take=50'),
    apiFetch<ServiceItem[]>(`/services?take=${ROW}`),
  ]);
  if (!listings.ok || !services.ok) return <SignalLost />;
  if (listings.data.length === 0 && services.data.length === 0) return <EmptyStreet />;

  const byType = (t: ListingItem['type']) => listings.data.filter((l) => l.type === t).slice(0, ROW).map(listingToCard);
  const newest = [
    ...listings.data.map((l) => ({ at: l.createdAt, card: listingToCard(l) })),
    ...services.data.map((s) => ({ at: s.createdAt, card: serviceToCard(s) })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ROW)
    .map((i) => i.card);

  // Foto de la publicación más reciente de cada categoría.
  const photos: Record<string, string> = {};
  for (const l of listings.data) if (l.images[0] && !photos[l.category]) photos[l.category] = l.images[0];
  const serviceWithPhoto = services.data.find((s) => s.images?.[0]);
  if (serviceWithPhoto?.images?.[0]) photos.Servicios = serviceWithPhoto.images[0];

  return (
    <>
      <ProductRow title="Lo más nuevo en tu comunidad" href="/buscar" cards={newest} />
      <ProductRow title="En venta" href="/buscar?tipo=venta" cards={byType('SALE')} />
      <ProductRow title="Para rentar" href="/buscar?tipo=renta" cards={byType('RENT')} />
      <ProductRow title="Para intercambiar, sin comisión" href="/buscar?tipo=intercambio" cards={byType('BARTER')} />
      <ProductRow title="Servicios de tus vecinos" href="/buscar?tipo=servicios" cards={services.data.map(serviceToCard)} />
      <CategoryGrid photos={photos} />
    </>
  );
}
