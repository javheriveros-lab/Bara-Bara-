import { CARD_KIND_LABEL, SERVICE_CATEGORY_LABEL, type ListingItem, type ServiceItem } from '@bara/shared';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { getSessionToken } from '@/lib/session';
import styles from '../perfil.module.css';
import { OwnerActions } from './OwnerActions';

export const metadata: Metadata = { title: 'Mis publicaciones · Bara Bara' };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  RESERVED: 'Apartada',
  PAUSED: 'Pausada',
  CLOSED: 'Cerrada',
};

const CLOSE_LABEL = { SALE: 'Vendida', RENT: 'Ya no la rento', BARTER: 'Intercambiada' } as const;

type Row = {
  id: string;
  kind: 'p' | 's';
  title: string;
  label: string;
  status: string;
  image?: string;
  createdAt: string;
  closeLabel: string;
};

export default async function MisPublicacionesPage() {
  const token = await getSessionToken();
  if (!token) redirect('/entrar?next=/perfil/publicaciones');

  const [listings, services] = await Promise.all([
    apiFetch<ListingItem[]>('/listings/mine', { token }),
    apiFetch<ServiceItem[]>('/services/mine', { token }),
  ]);
  if (listings.status === 401) redirect('/entrar?next=/perfil/publicaciones');

  const rows: Row[] = [
    ...(listings.ok ? listings.data : []).map((l) => ({
      id: l.id,
      kind: 'p' as const,
      title: l.title,
      label: CARD_KIND_LABEL[l.type],
      status: l.status,
      image: l.images[0],
      createdAt: l.createdAt,
      closeLabel: CLOSE_LABEL[l.type],
    })),
    ...(services.ok ? services.data : []).map((s) => ({
      id: s.id,
      kind: 's' as const,
      title: s.title,
      label: SERVICE_CATEGORY_LABEL[s.category],
      status: s.status,
      image: s.images?.[0],
      createdAt: s.createdAt,
      closeLabel: 'Ya no lo ofrezco',
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const failed = !listings.ok || !services.ok;

  return (
    <main className={styles.main}>
      <Link href="/perfil" className={styles.back}>
        ← Mi perfil
      </Link>
      <section className={styles.card} aria-labelledby="mis-pubs">
        <header className={styles.ownerHead}>
          <h1 id="mis-pubs" className={styles.sectionTitle}>
            Mis publicaciones
          </h1>
          <Link href="/publicar" className={styles.ctaCritical}>
            Publicar
          </Link>
        </header>

        {failed && <p className={styles.alertDanger}>No pudimos cargar todo. Recarga la página.</p>}
        {rows.length === 0 && !failed && (
          <p className={styles.muted}>Todavía no publicas nada. Lo que no usas le sirve a alguien de tu colonia.</p>
        )}

        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} className={styles.ownerRow}>
              <Link href={`/${r.kind}/${r.id}`} className={styles.ownerThumb} aria-hidden tabIndex={-1}>
                {r.image && <Image src={r.image} alt="" width={64} height={64} />}
              </Link>
              <div className={styles.ownerMain}>
                <Link href={`/${r.kind}/${r.id}`} className={styles.ownerTitle}>
                  {r.title}
                </Link>
                <span className={styles.muted}>
                  {r.label} · <span className={r.status === 'ACTIVE' ? styles.statusOn : styles.statusOff}>{STATUS_LABEL[r.status] ?? r.status}</span> ·{' '}
                  {formatRelative(r.createdAt)}
                </span>
                {r.status !== 'RESERVED' && <OwnerActions id={r.id} kind={r.kind} status={r.status} closeLabel={r.closeLabel} />}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
