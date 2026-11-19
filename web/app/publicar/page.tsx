import type { CardKind, CommissionSummary } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ImagePlusIcon } from '@/components/icons';
import { PublishForm } from '@/components/PublishForm/PublishForm';
import { apiFetch } from '@/lib/api';
import { kindFromSlug, sectionOf, SLUG_BY_KIND } from '@/lib/kinds';
import { formatMoney } from '@/lib/format';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import styles from './publicar.module.css';

export const metadata: Metadata = { title: 'Publicar · Bara Bara' };

const KINDS: { kind: CardKind; title: string; heading: string; text: string }[] = [
  { kind: 'SALE', title: 'Vender', heading: 'Agrega tu producto', text: 'Dale otra vida a lo que ya no usas.' },
  { kind: 'RENT', title: 'Rentar', heading: 'Agrega tu producto en renta', text: 'Herramientas, equipo, tecnología. Con depósito opcional.' },
  { kind: 'BARTER', title: 'Intercambiar', heading: 'Agrega tu artículo para intercambiar', text: 'Cambia sin dinero: di qué ofreces y qué buscas.' },
  { kind: 'SERVICE', title: 'Ofrecer un servicio', heading: 'Agrega tu servicio', text: 'Tu oficio para la comunidad, con precio claro o a cotizar.' },
];

export default async function PublicarPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(tipo ? `/publicar?tipo=${tipo}` : '/publicar')}`);

  const kind = kindFromSlug(tipo);
  const selected = KINDS.find((k) => k.kind === kind);

  // Con comisiones vencidas no se puede publicar (la API también lo impide).
  const billing = await apiFetch<CommissionSummary>('/commissions', { token: await getSessionToken() });
  if (billing.ok && billing.data.onHold) {
    return (
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Publicaciones en pausa</h1>
          <p>
            Tienes {formatMoney(billing.data.overdueTotal)} de comisiones vencidas. Mientras no las pagues no puedes publicar y
            tus publicaciones no aparecen en la comunidad.
          </p>
        </header>
        <Link href="/perfil/comisiones" className={styles.payCta}>
          Pagar comisiones
        </Link>
      </main>
    );
  }

  if (!selected) {
    return (
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>¿Qué quieres publicar?</h1>
          <p>Intercambio gratis. En venta, renta y servicios, Bara Bara cobra 5% solo cuando cierras el trato.</p>
        </header>
        <nav className={styles.tiles} aria-label="Tipo de publicación">
          {KINDS.map((k, i) => (
            <Link
              key={k.kind}
              href={`/publicar?tipo=${SLUG_BY_KIND[k.kind]}`}
              className={styles.tile}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className={styles.tilePillar}>{sectionOf(k.kind).label}</span>
              <span className={styles.tileTitle}>{k.title}</span>
              <span className={styles.tileText}>{k.text}</span>
            </Link>
          ))}
        </nav>
      </main>
    );
  }

  const uploads = await apiFetch<{ enabled: boolean }>('/uploads/status');

  return (
    <main className={styles.main}>
      <Link href="/publicar" className={styles.back}>
        ← Cambiar tipo
      </Link>
      <div className={styles.card}>
        {/* Encabezado como en el diseño: banda con el degradado rojo → violeta y el ícono de foto. */}
        <header className={styles.hero}>
          <div>
            <h1>{selected.heading}</h1>
            <p>{selected.text}</p>
          </div>
          <span className={styles.heroIcon} aria-hidden>
            <ImagePlusIcon />
          </span>
        </header>
        <PublishForm
          kind={selected.kind}
          defaultNeighborhood={user.neighborhood ?? undefined}
          uploadsEnabled={uploads.ok && uploads.data.enabled}
        />
      </div>
    </main>
  );
}
