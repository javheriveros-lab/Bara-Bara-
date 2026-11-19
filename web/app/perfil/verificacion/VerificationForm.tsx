'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { CheckboxField, FormError, SubmitButton } from '@/components/form/Field';
import { LoadingOverlay } from '@/components/Loading/LoadingOverlay';
import { PrivateUpload } from '@/components/PrivateUpload/PrivateUpload';
import { submitVerificationAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from '../perfil.module.css';

export function VerificationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitVerificationAction, {});
  const err = state.fields ?? {};

  return (
    <form action={action} className={styles.stack} noValidate>
      <FormError message={state.message} />
      <PrivateUpload purpose="kyc" name="ineFront" label="1. INE (frente)" hint="Que se lean tu nombre y tu foto." error={err.ineFront} />
      <PrivateUpload purpose="kyc" name="ineBack" label="2. INE (reverso)" error={err.ineBack} />
      <PrivateUpload
        purpose="kyc"
        name="proofOfAddress"
        label="3. Comprobante de domicilio"
        hint="Luz, agua, teléfono o predial de los últimos 3 meses. Puede estar a nombre de un familiar."
        error={err.proofOfAddress}
      />
      <CheckboxField name="kycConsent" error={err.kycConsent}>
        Autorizo a Bara Bara a usar mi INE y comprobante de domicilio solo para verificar mi identidad, como dice el{' '}
        <Link href="/privacidad" target="_blank">
          aviso de privacidad
        </Link>
        . Mis documentos se guardan en privado y nunca se muestran a otros vecinos.
      </CheckboxField>
      {pending && <LoadingOverlay label="Enviando documentos…" />}
      <SubmitButton pending={pending} pendingLabel="Enviando…">
        Enviar a revisión
      </SubmitButton>
    </form>
  );
}
