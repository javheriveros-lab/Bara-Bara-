import type { ListingItem, ServiceItem } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CartIcon } from '@/components/icons';
import { ListingCard, type ListingCardProps } from '@/components/ListingCard';
import { SignalLost } from '@/components/Punk/SignalLost';
import store from '@/components/Store/Store.module.css';
import { apiFetch } from '@/lib/api';
import { listingToCard, serviceToCard } from '@/lib/cards';
import { removeSavedFormAction, type SavedKind } from '@/lib/saved-actions';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import styles from './guardados.module.css';

export const metadata: Metadata = { title: 'Guardados · Bara Bara', robots: { index: false } };

type SavedEntry = { savedAt: string; listing?: ListingItem; service?: ServiceItem };
type SavedCard = { kind: SavedKind; id: string; card: ListingCardProps };

/** "Guardados": el carrito de Bara Bara. Desde aquí se abre cada publicación para negociar en el chat. */
export default async function GuardadosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/guardados');
  const res = await apiFetch<SavedEntry[]>('/saved', { token: await getSessionToken() });

  const items: SavedCard[] = res.ok
    ? res.data.flatMap((e): SavedCard[] =>
        e.listing
          ? [{ kind: 'listing', id: e.listing.id, card: listingToCard(e.listing) }]
          : e.service
            ? [{ kind: 'service', id: e.service.id, card: serviceToCard(e.service) }]
            : [],
      )
    : [];

  return (
    <main className={store.main}>
      <div className={store.panel}>
        <section className={store.section} aria-labelledby="guardados">
          <div className={styles.head}>
            <h1 className={styles.title} id="guardados">
              Guardados
            </h1>
            {res.ok && items.length > 0 && (
              <p className={styles.meta}>
                {items.length} {items.length === 1 ? 'publicación' : 'publicaciones'}. Los tratos se cierran en el chat con
                cada vecino.
              </p>
            )}
          </div>

          {!res.ok ? (
            <SignalLost />
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <CartIcon size={34} />
              </span>
              <p className={styles.emptyTitle}>Todavía no guardas nada</p>
              <p className={styles.emptyText}>
                Toca «Guardar» en cualquier publicación para tenerla a la mano y negociar después.
              </p>
              <Link href="/" className={styles.emptyCta}>
                Explorar la comunidad
              </Link>
            </div>
          ) : (
            <ul className={styles.grid}>
              {items.map((it) => (
                <li key={`${it.kind}-${it.id}`} className={styles.item}>
                  <ListingCard {...it.card} />
                  <div className={styles.row}>
                    <Link href={it.card.href} className={styles.negotiate}>
                      Negociar
                    </Link>
                    <form action={removeSavedFormAction}>
                      <input type="hidden" name="kind" value={it.kind} />
                      <input type="hidden" name="id" value={it.id} />
                      <button type="submit" className={styles.remove}>
                        Quitar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
