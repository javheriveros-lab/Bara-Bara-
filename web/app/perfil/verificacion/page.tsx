import type { VerificationState } from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheckIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import styles from '../perfil.module.css';
import { VerificationForm } from './VerificationForm';

export const metadata: Metadata = { title: 'Verificar identidad · Bara Bara' };

const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' });

export default async function VerificacionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/perfil/verificacion');

  const token = await getSessionToken();
  const [state, uploads] = await Promise.all([
    apiFetch<VerificationState>('/verification/me', { token }),
    apiFetch<{ enabled: boolean }>('/uploads/status'),
  ]);
  if (!state.ok) throw new Error('No pudimos cargar tu verificación');
  const v = state.data;
  const canSubmit = v.status === 'UNVERIFIED' || v.status === 'REJECTED';

  return (
    <main className={styles.main}>
      <Link href="/perfil" className={styles.back}>
        ← Mi perfil
      </Link>
      <section className={styles.card}>
        <header className={styles.stack}>
          <h1 className={styles.name}>Vecino verificado</h1>
          <p className={styles.note}>
            Es opcional. Confirmamos tu identidad (INE) y que vives en la comunidad (comprobante de domicilio). A cambio
            ganas la insignia <ShieldCheckIcon /> que da confianza al rentar, intercambiar o contratar servicios.
          </p>
        </header>

        {v.status === 'PENDING' && (
          <p className={styles.alertInfo} role="status">
            Estamos revisando tus documentos{v.submittedAt ? ` (enviados el ${dateFmt.format(new Date(v.submittedAt))})` : ''}. Te
            avisaremos aquí mismo.
          </p>
        )}
        {v.status === 'VERIFIED' && (
          <p className={styles.alertInfo} role="status">
            <ShieldCheckIcon /> Tu identidad y domicilio están verificados. Los vecinos ven tu insignia.
          </p>
        )}
        {v.status === 'REJECTED' && (
          <p className={styles.alertDanger} role="alert">
            No pudimos validar tus documentos{v.reviewerNote ? `: ${v.reviewerNote}` : '.'} Corrige y vuelve a enviarlos.
          </p>
        )}

        {canSubmit &&
          (uploads.ok && uploads.data.enabled ? (
            <VerificationForm />
          ) : (
            <p className={styles.alertInfo}>La subida de documentos todavía no está activada. Vuelve pronto.</p>
          ))}

        <div className={styles.private}>
          <h2 className={styles.privateTitle}>Tu privacidad</h2>
          <ul className={styles.bullets}>
            <li>Tus documentos se guardan en un almacenamiento privado, nunca con un enlace público.</li>
            <li>Solo el equipo de Bara Bara los ve, con enlaces que caducan en 10 minutos.</li>
            <li>Los demás vecinos solo ven la insignia; nunca tu dirección, CURP ni foto de la INE.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
