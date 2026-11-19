import { CARD_KIND_LABEL, COMMISSION_DUE_DAYS, type CommissionPaymentStatus, type CommissionSummary } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReliableIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import styles from '../perfil.module.css';
import { CopyButton, CreatePaymentForm, ProofForm } from './PaymentForms';

export const metadata: Metadata = { title: 'Mis comisiones · Bara Bara' };

const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' });
const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '-');

const PAYMENT_STATUS: Record<CommissionPaymentStatus, string> = {
  PENDING: 'Esperando depósito',
  PROOF_SUBMITTED: 'Comprobante en revisión',
  PAID: 'Pagado',
  REJECTED: 'Comprobante rechazado',
  CANCELLED: 'Sin usar',
};

export default async function ComisionesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/perfil/comisiones');

  const token = await getSessionToken();
  const [summary, uploads] = await Promise.all([
    apiFetch<CommissionSummary>('/commissions', { token }),
    apiFetch<{ enabled: boolean }>('/uploads/status'),
  ]);
  if (!summary.ok) throw new Error('No pudimos cargar tus comisiones');
  const s = summary.data;
  const active = s.activePayment;
  // Si llegaron tratos nuevos después de generar la referencia, hay que actualizarla.
  const referenceOutdated = active?.status === 'PENDING' && Math.round(active.amount * 100) !== Math.round(s.pendingTotal * 100);
  const lastRejected = s.payments[0]?.status === 'REJECTED' ? s.payments[0] : undefined;

  return (
    <main className={styles.main}>
      <Link href="/perfil" className={styles.back}>
        ← Mi perfil
      </Link>
      <section className={styles.card}>
        <header className={styles.stack}>
          <h1 className={styles.name}>Comisiones</h1>
          <p className={styles.note}>
            Bara Bara cobra 5% en venta, renta y servicios cuando se confirma el trato; el intercambio es gratis. Se descuenta de
            lo que tú recibes y tienes {COMMISSION_DUE_DAYS} días para pagarla por SPEI. En renta se cobra solo sobre la
            tarifa, nunca sobre la fianza.
          </p>
          {s.reliablePayer && (
            <span className={styles.badgeOn}>
              <ReliableIcon /> Vecino Confiable
            </span>
          )}
        </header>

        {s.onHold && (
          <p className={styles.alertDanger} role="alert">
            Tienes {formatMoney(s.overdueTotal)} vencidos. Tus publicaciones están pausadas y no puedes publicar hasta
            pagar.
          </p>
        )}

        <dl className={styles.stats}>
          <div>
            <dt>Por pagar</dt>
            <dd>{formatMoney(s.pendingTotal)}</dd>
          </div>
          <div>
            <dt>Vencido</dt>
            <dd className={s.overdueTotal > 0 ? styles.danger : undefined}>{formatMoney(s.overdueTotal)}</dd>
          </div>
          <div>
            <dt>Vence</dt>
            <dd>{fmtDate(s.nextDueAt)}</dd>
          </div>
        </dl>

        {s.pendingTotal > 0 && (
          <section className={styles.stack} aria-labelledby="pay-title">
            <h2 id="pay-title" className={styles.sectionTitle}>
              Pagar por SPEI
            </h2>

            {lastRejected?.reviewerNote && (
              <p className={styles.alertDanger}>Rechazamos tu último comprobante: {lastRejected.reviewerNote}</p>
            )}

            {!s.bank ? (
              <p className={styles.alertInfo}>El pago por SPEI todavía no está disponible. Te avisaremos cuando lo esté.</p>
            ) : active?.status === 'PROOF_SUBMITTED' ? (
              <p className={styles.alertInfo} role="status">
                Recibimos tu comprobante de {formatMoney(active.amount)} (referencia {active.reference}). Lo estamos
                revisando.
              </p>
            ) : active?.status === 'PENDING' && !referenceOutdated ? (
              <>
                <dl className={styles.transfer}>
                  <div>
                    <dt>Monto exacto</dt>
                    <dd>
                      <strong className={styles.bigAmount}>{formatMoney(active.amount)}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Referencia / concepto</dt>
                    <dd>
                      <code>{active.reference}</code> <CopyButton value={active.reference} label="referencia" />
                    </dd>
                  </div>
                  <div>
                    <dt>CLABE</dt>
                    <dd>
                      <code>{s.bank.clabe}</code> <CopyButton value={s.bank.clabe} label="CLABE" />
                    </dd>
                  </div>
                  <div>
                    <dt>Beneficiario</dt>
                    <dd>
                      {s.bank.beneficiary}
                      {s.bank.bankName && ` · ${s.bank.bankName}`}
                    </dd>
                  </div>
                </dl>
                <p className={styles.note}>
                  Escribe la referencia en el concepto: así tu pago se registra solo. Válida hasta el {fmtDate(active.expiresAt)}
                  . ¿Ya pagaste y no se refleja? Sube tu comprobante.
                </p>
                <ProofForm paymentId={active.id} uploadsEnabled={uploads.ok && uploads.data.enabled} />
              </>
            ) : (
              <CreatePaymentForm label={referenceOutdated ? 'Actualizar referencia' : 'Generar referencia de pago'} />
            )}
          </section>
        )}

        <section className={styles.stack} aria-labelledby="deals-title">
          <h2 id="deals-title" className={styles.sectionTitle}>
            Tratos con comisión
          </h2>
          {s.deals.length === 0 ? (
            <p className={styles.note}>Aún no cierras tratos con comisión.</p>
          ) : (
            <ul className={styles.list}>
              {s.deals.map((d) => (
                <li key={d.id} className={styles.listRow}>
                  <span className={styles.listMain}>
                    <strong>{d.itemTitle}</strong>
                    <span className={styles.muted}>
                      {CARD_KIND_LABEL[d.kind]} · con {d.buyerName} · {fmtDate(d.confirmedAt)} · {formatMoney(d.amount)}
                    </span>
                  </span>
                  <span className={styles.listSide}>
                    {formatMoney(d.commission)}
                    <span className={d.overdue ? styles.danger : styles.muted}>
                      {d.commissionStatus === 'PAID' ? 'Pagada' : d.overdue ? 'Vencida' : `Vence ${fmtDate(d.dueAt)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {s.payments.length > 0 && (
          <section className={styles.stack} aria-labelledby="payments-title">
            <h2 id="payments-title" className={styles.sectionTitle}>
              Pagos
            </h2>
            <ul className={styles.list}>
              {s.payments.map((p) => (
                <li key={p.id} className={styles.listRow}>
                  <span className={styles.listMain}>
                    <code>{p.reference}</code>
                    <span className={styles.muted}>{fmtDate(p.createdAt)}</span>
                  </span>
                  <span className={styles.listSide}>
                    {formatMoney(p.amount)}
                    <span className={styles.muted}>{PAYMENT_STATUS[p.status]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </main>
  );
}
