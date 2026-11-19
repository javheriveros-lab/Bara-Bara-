'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import styles from '@/components/AuthForm/AuthForm.module.css';
import { Field, FormError, FormSuccess, SubmitButton } from '@/components/form/Field';
import { forgotPasswordAction, resetPasswordAction } from '@/lib/auth-actions';
import type { FormState } from '@/lib/form-state';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>¿Olvidaste tu contraseña?</h1>
        <p className={styles.lead}>Te mandamos un enlace a tu correo para crear una nueva.</p>
      </header>
      <form action={action} className={styles.form} noValidate>
        <FormSuccess message={state.ok} />
        <FormError message={state.message} />
        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email}
          error={state.fields?.email}
        />
        <SubmitButton pending={pending} pendingLabel="Enviando…">
          Enviar enlace
        </SubmitButton>
      </form>
      <p className={styles.alt}>
        ¿Ya la recordaste? <Link href="/entrar">Entra</Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nueva contraseña</h1>
        <p className={styles.lead}>El enlace dura 30 minutos y sirve una sola vez.</p>
      </header>
      <form action={action} className={styles.form} noValidate>
        <input type="hidden" name="token" value={token} />
        <FormError message={state.message ?? state.fields?.token} />
        <Field
          name="password"
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          error={state.fields?.password}
          hint="Mínimo 8 caracteres, con letras y números."
          maxLength={72}
        />
        <Field
          name="confirm"
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          error={state.fields?.confirm}
          maxLength={72}
        />
        <SubmitButton pending={pending} pendingLabel="Guardando…">
          Guardar contraseña
        </SubmitButton>
      </form>
      <p className={styles.alt}>
        ¿El enlace venció? <Link href="/olvide">Pide otro</Link>
      </p>
    </div>
  );
}
