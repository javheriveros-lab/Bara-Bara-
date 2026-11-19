'use client';

import { useActionState } from 'react';
import { reviewReportAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from './admin.module.css';

/** Acciones sobre un reporte: quitar la publicación, descartar, o suspender a quien publicó. */
export function ReportReview({ reportId, userId, suspended }: { reportId: string; userId: string; suspended: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewReportAction, {});
  const noteId = `note-${reportId}`;

  return (
    <form action={action} className={styles.review}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="userId" value={userId} />
      {!suspended && (
        <>
          <label htmlFor={noteId} className={styles.noteLabel}>
            Motivo de la suspensión (solo si suspendes)
          </label>
          <input
            id={noteId}
            name="note"
            className={styles.noteInput}
            placeholder="Ej. Intentó cobrar por adelantado y no entregó"
            aria-invalid={state.fields?.note ? true : undefined}
          />
        </>
      )}
      {(state.fields?.note || (state.message && state.message !== 'Listo')) && (
        <p className={styles.error} role="alert">
          {state.fields?.note ?? state.message}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" name="decision" value="remove" className={styles.reject} disabled={pending}>
          Quitar publicación
        </button>
        <button type="submit" name="decision" value="dismiss" className={styles.approve} disabled={pending}>
          Descartar reporte
        </button>
        {suspended ? (
          <button type="submit" name="decision" value="unsuspend" className={styles.approve} disabled={pending}>
            Quitar suspensión
          </button>
        ) : (
          <button
            type="submit"
            name="decision"
            value="suspend"
            className={styles.reject}
            disabled={pending}
            onClick={(e) => {
              if (!confirm('¿Suspender esta cuenta? No podrá entrar y sus publicaciones se ocultan.')) e.preventDefault();
            }}
          >
            Suspender cuenta
          </button>
        )}
      </div>
    </form>
  );
}
