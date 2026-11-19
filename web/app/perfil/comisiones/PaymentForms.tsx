'use client';

import { useActionState, useState } from 'react';
import { FormError, SubmitButton } from '@/components/form/Field';
import { LoadingOverlay } from '@/components/Loading/LoadingOverlay';
import { PrivateUpload } from '@/components/PrivateUpload/PrivateUpload';
import { createPaymentAction, submitProofAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from '../perfil.module.css';

/** Genera (o actualiza) la referencia SPEI. */
export function CreatePaymentForm({ label }: { label: string }) {
  const [state, action, pending] = useActionState<FormState>(createPaymentAction, {});
  return (
    <form action={action} className={styles.stack}>
      <FormError message={state.message} />
      <button type="submit" className={styles.ctaCritical} disabled={pending}>
        {pending ? 'Generando…' : label}
      </button>
    </form>
  );
}

export function ProofForm({ paymentId, uploadsEnabled }: { paymentId: string; uploadsEnabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitProofAction, {});
  if (!uploadsEnabled) {
    return <p className={styles.note}>La subida de comprobantes aún no está activada; tu pago se concilia con la referencia.</p>;
  }
  return (
    <form action={action} className={styles.stack} noValidate>
      <input type="hidden" name="paymentId" value={paymentId} />
      <FormError message={state.message} />
      <PrivateUpload
        purpose="payment"
        name="proof"
        label="Comprobante de la transferencia"
        hint="Captura o PDF del SPEI. Solo lo ve el equipo de Bara Bara."
        error={state.fields?.proof}
      />
      {pending && <LoadingOverlay label="Enviando comprobante…" />}
      <SubmitButton pending={pending} pendingLabel="Enviando…">
        Enviar comprobante
      </SubmitButton>
    </form>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      aria-label={`Copiar ${label}`}
      onClick={() =>
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}
