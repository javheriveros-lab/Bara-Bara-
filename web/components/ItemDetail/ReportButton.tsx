'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { reportAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from './ItemDetail.module.css';

const REASONS = [
  { value: 'SCAM', label: 'Parece estafa' },
  { value: 'PROHIBITED', label: 'Algo prohibido (armas, drogas, animales…)' },
  { value: 'OFFENSIVE', label: 'Ofensivo o discriminatorio' },
  { value: 'OTHER', label: 'Otra razón' },
] as const;

/** "Reportar": un <details> que despliega un formulario corto. Sin sesión, manda a entrar. */
export function ReportButton({ id, kind, loggedIn, back }: { id: string; kind: 'p' | 's'; loggedIn: boolean; back: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reportAction, {});

  if (!loggedIn) {
    return (
      <p className={styles.report}>
        <Link href={`/entrar?next=${encodeURIComponent(back)}`} className={styles.reportToggle}>
          Reportar publicación
        </Link>
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className={styles.report} role="status">
        {state.ok}
      </p>
    );
  }

  return (
    <details className={styles.report}>
      <summary className={styles.reportToggle}>Reportar publicación</summary>
      <form action={action} className={styles.reportForm}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value={kind} />
        <fieldset className={styles.reportReasons}>
          <legend>¿Qué pasa con esta publicación?</legend>
          {REASONS.map((r) => (
            <label key={r.value}>
              <input type="radio" name="reason" value={r.value} required />
              {r.label}
            </label>
          ))}
        </fieldset>
        {state.fields?.reason && <p className={styles.reportError}>{state.fields.reason}</p>}
        <label className={styles.reportNote}>
          <span>Cuéntanos más (opcional)</span>
          <textarea name="note" rows={2} maxLength={500} />
        </label>
        {state.message && (
          <p className={styles.reportError} role="alert">
            {state.message}
          </p>
        )}
        <button type="submit" className={styles.reportSubmit} disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </form>
    </details>
  );
}
