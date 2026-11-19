import type { CommissionSummary, VerificationStatus } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReliableIcon, ShieldCheckIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { logoutAction } from '@/lib/auth-actions';
import { formatMoney } from '@/lib/format';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import styles from './perfil.module.css';

export const metadata: Metadata = { title: 'Mi perfil · Bara Bara' };

const VERIFICATION_COPY: Record<VerificationStatus, { label: string; detail: string; action?: string }> = {
  UNVERIFIED: {
    label: 'Sin verificar',
    detail: 'Verifica tu INE y comprobante de domicilio para ganar la insignia de Vecino Verificado.',
    action: 'Verificar mi identidad',
  },
  PENDING: { label: 'En revisión', detail: 'Estamos revisando tus documentos.' },
  VERIFIED: { label: 'Vecino verificado', detail: 'Tu identidad y domicilio están confirmados.' },
  REJECTED: {
    label: 'Rechazado',
    detail: 'No pudimos validar tus documentos. Puedes intentarlo de nuevo.',
    action: 'Ver motivo y reintentar',
  },
};

export default async function PerfilPage() {
  // El middleware solo mira la cookie; aquí el backend confirma que el token es válido.
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/perfil');

  const verification = VERIFICATION_COPY[user.verificationStatus];
  const verified = user.verificationStatus === 'VERIFIED';
  const billing = await apiFetch<CommissionSummary>('/commissions', { token: await getSessionToken() });
  const b = billing.ok ? billing.data : null;

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.name}>{user.displayName}</h1>
          <span className={verified ? styles.badgeOn : styles.badge}>
            {verified && <ShieldCheckIcon />}
            {verification.label}
          </span>
          {user.reliablePayer && (
            <span className={styles.badgeOn} title="Pagas tus comisiones a tiempo">
              <ReliableIcon />
              Vecino Confiable
            </span>
          )}
        </header>

        <dl className={styles.stats}>
          <div>
            <dt>Reputación</dt>
            <dd>{user.reviewCount > 0 ? `★ ${user.reputationScore.toFixed(1)}` : '-'}</dd>
          </div>
          <div>
            <dt>Reseñas</dt>
            <dd>{user.reviewCount}</dd>
          </div>
          <div>
            <dt>Colonia</dt>
            <dd>{user.neighborhood ?? '-'}</dd>
          </div>
        </dl>

        <p className={styles.note}>
          {verification.detail}{' '}
          <Link href="/perfil/verificacion" className={styles.inlineLink}>
            {verification.action ?? 'Ver detalle'}
          </Link>
        </p>

        {b && (
          <section className={b.onHold ? styles.billingHold : styles.billing} aria-labelledby="billing-title">
            <div className={styles.billingText}>
              <h2 id="billing-title" className={styles.sectionTitle}>
                Comisiones
              </h2>
              <p>
                {b.pendingTotal > 0 ? (
                  <>
                    Por pagar: <strong>{formatMoney(b.pendingTotal)}</strong>
                    {b.overdueTotal > 0 && <span className={styles.danger}> · {formatMoney(b.overdueTotal)} vencidos</span>}
                  </>
                ) : (
                  'Estás al corriente.'
                )}
              </p>
              {b.onHold && <p className={styles.danger}>Tus publicaciones están pausadas hasta que pagues.</p>}
            </div>
            <Link href="/perfil/comisiones" className={b.pendingTotal > 0 ? styles.ctaCritical : styles.ctaGhost}>
              {b.pendingTotal > 0 ? 'Pagar por SPEI' : 'Ver historial'}
            </Link>
          </section>
        )}

        <nav className={styles.accountLinks} aria-label="Tu cuenta">
          <Link href="/perfil/publicaciones" className={styles.ctaGhost}>
            Mis publicaciones
          </Link>
          <Link href="/perfil/editar" className={styles.ctaGhost}>
            Editar perfil
          </Link>
        </nav>

        <div className={styles.private}>
          <h2 className={styles.privateTitle}>Solo tú ves esto</h2>
          <p>{user.email}</p>
        </div>

        <form action={logoutAction}>
          <button type="submit" className={styles.logout}>
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
