'use client';

import { useActionState } from 'react';
import { reviewPaymentAction, reviewVerificationAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from './admin.module.css';

/** Aprobar o rechazar (con motivo) una verificación o un comprobante de pago. */
export function ReviewForm({ kind, id }: { kind: 'verification' | 'payment'; id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    kind === 'verification' ? reviewVerificationAction : reviewPaymentAction,
    {},
  );
  const noteId = `note-${id}`;

  return (
    <form action={action} className={styles.review}>
      <input type="hidden" name={kind === 'verification' ? 'userId' : 'paymentId'} value={id} />
      <label htmlFor={noteId} className={styles.noteLabel}>
        Motivo (solo si rechazas; el vecino lo verá)
      </label>
      <input
        id={noteId}
        name="note"
        className={styles.noteInput}
        placeholder={kind === 'verification' ? 'Ej. La INE está borrosa' : 'Ej. El monto no coincide'}
        aria-invalid={state.fields?.note ? true : undefined}
      />
      {(state.fields?.note || (state.message && state.message !== 'Listo')) && (
        <p className={styles.error} role="alert">
          {state.fields?.note ?? state.message}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" name="decision" value="approve" className={styles.approve} disabled={pending}>
          {kind === 'verification' ? 'Aprobar' : 'Confirmar pago'}
        </button>
        <button type="submit" name="decision" value="reject" className={styles.reject} disabled={pending}>
          Rechazar
        </button>
      </div>
    </form>
  );
}
