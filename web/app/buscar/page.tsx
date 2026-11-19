import type { ListingItem, ServiceItem } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ListingCard } from '@/components/ListingCard';
import { EmptyStreet } from '@/components/Punk/EmptyStreet';
import { SignalLost } from '@/components/Punk/SignalLost';
import store from '@/components/Store/Store.module.css';
import { apiFetch } from '@/lib/api';
import { listingToCard, serviceToCard } from '@/lib/cards';
import { feedFilterFromSlug } from '@/lib/kinds';
import styles from './buscar.module.css';

const TAKE = 48;

type Params = { q?: string; tipo?: string; categoria?: string; colonia?: string; exacto?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { q, categoria } = await searchParams;
  const what = q?.trim() || categoria?.trim();
  return { title: what ? `${what} · Buscar en Bara Bara` : 'Buscar · Bara Bara', robots: { index: false } };
}

/** Resultados de búsqueda: texto libre (`q`), pilar (`tipo`) y categoría (`categoria`). */
export default async function BuscarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const q = (raw.q ?? '').trim().slice(0, 60);
  const categoria = (raw.categoria ?? '').trim().slice(0, 40);
  const colonia = (raw.colonia ?? '').trim().slice(0, 80);
  const filter = feedFilterFromSlug(raw.tipo);
  const kinds = filter?.kinds ?? ['SALE', 'RENT', 'BARTER', 'SERVICE'];

  const exact = raw.exacto === '1';

  const listingTypes = kinds.filter((k) => k !== 'SERVICE');
  // Las categorías del menú son de objetos; los servicios entran solo en búsquedas sin categoría.
  const wantServices = kinds.includes('SERVICE') && !categoria;

  /** Busca un texto con los filtros activos: objetos (por tipo) y servicios, lo más reciente primero. */
  const run = async (term: string) => {
    const qs = (extra: Record<string, string | undefined>) => {
      const p = new URLSearchParams({ take: String(TAKE) });
      for (const [k, v] of Object.entries({ q: term || undefined, neighborhood: colonia || undefined, ...extra })) if (v) p.set(k, v);
      return p.toString();
    };
    const [listingResults, services] = await Promise.all([
      Promise.all(
        listingTypes.length === 3
          ? [apiFetch<ListingItem[]>(`/listings?${qs({ category: categoria || undefined })}`)]
          : listingTypes.map((type) => apiFetch<ListingItem[]>(`/listings?${qs({ type, category: categoria || undefined })}`)),
      ),
      wantServices ? apiFetch<ServiceItem[]>(`/services?${qs({})}`) : null,
    ]);
    const failed = listingResults.some((r) => !r.ok) || Boolean(services && !services.ok);
    const cards = failed
      ? []
      : [
          ...listingResults.flatMap((r) => (r.ok ? r.data : [])).map((l) => ({ at: l.createdAt, card: listingToCard(l) })),
          ...(services?.ok ? services.data.map((s) => ({ at: s.createdAt, card: serviceToCard(s) })) : []),
        ]
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((i) => i.card);
    return { failed, cards };
  };

  // Autocorrector: se consulta junto con la búsqueda original.
  const [original, suggestion] = await Promise.all([
    run(q),
    q && !exact ? apiFetch<{ corrected: string | null }>(`/search/suggest?q=${encodeURIComponent(q)}`) : null,
  ]);
  const corrected = suggestion?.ok ? suggestion.data.corrected : null;
  // Sin resultados con lo escrito pero hay corrección: se muestran los de la corrección (como un buscador grande).
  const autoFixed = Boolean(corrected && !original.failed && original.cards.length === 0);
  const { failed, cards } = autoFixed ? await run(corrected!) : original;
  const shownQuery = autoFixed ? corrected! : q;

  const linkWith = (extra: Record<string, string>) =>
    `/buscar?${new URLSearchParams({ ...(filter && { tipo: filter.slug }), ...(categoria && { categoria }), ...(colonia && { colonia }), ...extra })}`;

  const heading = q ? `Resultados para “${shownQuery}”` : categoria ? categoria : filter ? filter.label : colonia ? `Cerca de ti: ${colonia}` : 'Todo en Bara Bara';
  const scope = [filter?.label, q && categoria ? categoria : undefined].filter(Boolean).join(' · ');

  return (
    <main className={store.main}>
      <div className={store.panel}>
        <section className={store.section} aria-labelledby="resultados">
          <div className={styles.head}>
            <h1 className={styles.title} id="resultados">
              {heading}
            </h1>
            <p className={styles.meta}>
              {failed ? 'Sin conexión' : `${cards.length} ${cards.length === 1 ? 'publicación' : 'publicaciones'}`}
              {scope && <span> en {scope}</span>}
            </p>
          </div>

          {autoFixed ? (
            <p className={styles.fix}>
              No encontramos «{q}», así que te mostramos resultados para <strong>«{corrected}»</strong>.{' '}
              <a href={linkWith({ q, exacto: '1' })}>Buscar exactamente «{q}»</a>
            </p>
          ) : (
            corrected && (
              <p className={styles.fix}>
                ¿Quisiste decir <a href={linkWith({ q: corrected })}>«{corrected}»</a>?
              </p>
            )
          )}

          {(q || categoria || filter) && (
            <div className={styles.chips} aria-label="Filtros activos">
              {filter && (
                <Link className={styles.chip} href={`/buscar?${new URLSearchParams({ ...(q && { q }), ...(categoria && { categoria }) })}`}>
                  {filter.label} <span aria-hidden>×</span>
                  <span className={styles.srOnly}>Quitar filtro</span>
                </Link>
              )}
              {categoria && (
                <Link className={styles.chip} href={`/buscar?${new URLSearchParams({ ...(q && { q }), ...(filter && { tipo: filter.slug }) })}`}>
                  {categoria} <span aria-hidden>×</span>
                  <span className={styles.srOnly}>Quitar filtro</span>
                </Link>
              )}
            </div>
          )}

          {failed ? (
            <SignalLost />
          ) : cards.length === 0 ? (
            <EmptyStreet section={q ? `“${q}”` : (categoria || filter?.label)} />
          ) : (
            <div className={store.grid}>
              {cards.map((card) => (
                <ListingCard key={card.href} {...card} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
