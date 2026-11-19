import { CARD_KIND_LABEL, type CardKind, type VerificationDocType } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import styles from './admin.module.css';
import { ReportReview } from './ReportReview';
import { ReviewForm } from './ReviewForm';

export const metadata: Metadata = { title: 'Revisión · Bara Bara', robots: { index: false } };

interface VerificationRequest {
  id: string;
  displayName: string;
  email: string;
  neighborhood: string | null;
  submittedAt: string | null;
  documents: { type: VerificationDocType; url: string | null; isPdf: boolean }[];
}

interface PaymentReview {
  id: string;
  reference: string;
  amount: number;
  proofUrl: string | null;
  proofIsPdf: boolean;
  proofSubmittedAt: string | null;
  user: { id: string; displayName: string; email: string };
  deals: { id: string; kind: CardKind; amount: number; commission: number; itemTitle: string; buyerName: string }[];
}

interface ReportRow {
  id: string;
  reason: 'PROHIBITED' | 'SCAM' | 'OFFENSIVE' | 'OTHER';
  note: string | null;
  createdAt: string;
  reporter: { id: string; displayName: string };
  reportedUser: { id: string; displayName: string; email: string; suspendedAt: string | null };
  listing: { id: string; title: string; status: string } | null;
  service: { id: string; title: string; status: string } | null;
}

const REASON_LABEL: Record<ReportRow['reason'], string> = {
  PROHIBITED: 'Prohibido',
  SCAM: 'Posible estafa',
  OFFENSIVE: 'Ofensivo',
  OTHER: 'Otro',
};

const DOC_LABEL: Record<VerificationDocType, string> = {
  INE: 'INE frente',
  INE_BACK: 'INE reverso',
  PROOF_OF_ADDRESS: 'Comprobante de domicilio',
};

const dateFmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '-');

/** Solo ADMIN (el backend lo vuelve a comprobar en cada llamada). Para los demás, no existe. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/admin');
  if (user.role !== 'ADMIN') notFound();

  const requested = (await searchParams).tab;
  const tab = requested === 'pagos' || requested === 'reportes' ? requested : 'verificaciones';
  const token = await getSessionToken();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Revisión</h1>
      <nav className={styles.tabs} aria-label="Colas de revisión">
        <Link href="/admin" aria-current={tab === 'verificaciones' ? 'page' : undefined}>
          Verificaciones
        </Link>
        <Link href="/admin?tab=pagos" aria-current={tab === 'pagos' ? 'page' : undefined}>
          Comprobantes de pago
        </Link>
        <Link href="/admin?tab=reportes" aria-current={tab === 'reportes' ? 'page' : undefined}>
          Reportes
        </Link>
      </nav>
      <p className={styles.hint}>Los enlaces a documentos caducan en 10 minutos. Recarga la página para generar nuevos.</p>
      {tab === 'verificaciones' && <Verifications token={token} />}
      {tab === 'pagos' && <Payments token={token} />}
      {tab === 'reportes' && <Reports token={token} />}
    </main>
  );
}

async function Verifications({ token }: { token?: string }) {
  const res = await apiFetch<VerificationRequest[]>('/admin/verifications', { token });
  if (!res.ok) throw new Error('No pudimos cargar las verificaciones');
  if (!res.data.length) return <p className={styles.empty}>No hay verificaciones pendientes.</p>;

  return (
    <ul className={styles.queue}>
      {res.data.map((r) => (
        <li key={r.id} className={styles.item}>
          <header className={styles.itemHeader}>
            <strong>{r.displayName}</strong>
            <span className={styles.meta}>
              {r.email} · {r.neighborhood ?? 'Sin colonia'} · enviado {fmt(r.submittedAt)}
            </span>
          </header>
          <div className={styles.docs}>
            {r.documents.map((d) => (
              <Doc key={d.type} label={DOC_LABEL[d.type]} url={d.url} isPdf={d.isPdf} />
            ))}
          </div>
          <ReviewForm kind="verification" id={r.id} />
        </li>
      ))}
    </ul>
  );
}

async function Payments({ token }: { token?: string }) {
  const res = await apiFetch<PaymentReview[]>('/admin/payments', { token });
  if (!res.ok) throw new Error('No pudimos cargar los comprobantes');
  if (!res.data.length) return <p className={styles.empty}>No hay comprobantes por revisar.</p>;

  return (
    <ul className={styles.queue}>
      {res.data.map((p) => (
        <li key={p.id} className={styles.item}>
          <header className={styles.itemHeader}>
            <strong>
              {formatMoney(p.amount)} · <code>{p.reference}</code>
            </strong>
            <span className={styles.meta}>
              {p.user.displayName} ({p.user.email}) · enviado {fmt(p.proofSubmittedAt)}
            </span>
          </header>
          <ul className={styles.deals}>
            {p.deals.map((d) => (
              <li key={d.id}>
                {CARD_KIND_LABEL[d.kind]} · {d.itemTitle} · con {d.buyerName}: {formatMoney(d.amount)} → comisión{' '}
                {formatMoney(d.commission)}
              </li>
            ))}
          </ul>
          <div className={styles.docs}>
            <Doc label="Comprobante" url={p.proofUrl} isPdf={p.proofIsPdf} />
          </div>
          <ReviewForm kind="payment" id={p.id} />
        </li>
      ))}
    </ul>
  );
}

async function Reports({ token }: { token?: string }) {
  const res = await apiFetch<ReportRow[]>('/admin/reports', { token });
  if (!res.ok) throw new Error('No pudimos cargar los reportes');
  if (!res.data.length) return <p className={styles.empty}>No hay reportes abiertos.</p>;

  return (
    <ul className={styles.queue}>
      {res.data.map((r) => {
        const item = r.listing ?? r.service;
        const href = r.listing ? `/p/${r.listing.id}` : r.service ? `/s/${r.service.id}` : null;
        return (
          <li key={r.id} className={styles.item}>
            <header className={styles.itemHeader}>
              <strong>
                {REASON_LABEL[r.reason]} ·{' '}
                {href ? (
                  <Link href={href} target="_blank">
                    {item?.title}
                  </Link>
                ) : (
                  'Publicación'
                )}
                {item && item.status !== 'ACTIVE' && <span className={styles.meta}> ({item.status})</span>}
              </strong>
              <span className={styles.meta}>
                Publicó {r.reportedUser.displayName} ({r.reportedUser.email})
                {r.reportedUser.suspendedAt && ' · SUSPENDIDA'} · reportó {r.reporter.displayName} · {fmt(r.createdAt)}
              </span>
            </header>
            {r.note && <p className={styles.reportNote}>“{r.note}”</p>}
            <ReportReview reportId={r.id} userId={r.reportedUser.id} suspended={Boolean(r.reportedUser.suspendedAt)} />
          </li>
        );
      })}
    </ul>
  );
}

function Doc({ label, url, isPdf }: { label: string; url: string | null; isPdf: boolean }) {
  if (!url) {
    return (
      <div className={styles.doc}>
        <span>{label}</span>
        <span className={styles.meta}>Almacenamiento no configurado</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className={styles.doc}>
      <span>{label}</span>
      {isPdf ? (
        <span className={styles.meta}>PDF · abrir</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de ImageKit, no pasa por el loader
        <img src={url} alt={label} className={styles.thumb} referrerPolicy="no-referrer" />
      )}
    </a>
  );
}
