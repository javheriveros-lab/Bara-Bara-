'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { CheckboxField, Field, FormError, FormSuccess, SubmitButton } from '@/components/form/Field';
import { loginAction, registerAction } from '@/lib/auth-actions';
import type { FormState } from '@/lib/form-state';
import styles from './AuthForm.module.css';

interface AuthFormProps {
  mode: 'login' | 'register';
  /** Ruta a la que volver tras entrar (ya validada en el servidor). */
  next?: string;
  /** Aviso arriba del formulario (ej. "ya cambiaste tu contraseña"). */
  notice?: string;
}

const COPY = {
  login: {
    title: 'Entrar a la comunidad',
    lead: 'Tus vecinos te esperan.',
    submit: 'Entrar',
    pending: 'Entrando…',
    alt: { text: '¿Primera vez?', link: 'Súmate a la comunidad', href: '/registro' },
  },
  register: {
    title: 'Súmate a la comunidad',
    lead: 'Sin comisiones abusivas. Sin especulación. Solo vecinos.',
    submit: 'Crear cuenta',
    pending: 'Creando cuenta…',
    alt: { text: '¿Ya tienes cuenta?', link: 'Entra', href: '/entrar' },
  },
} as const;

export function AuthForm({ mode, next, notice }: AuthFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    mode === 'login' ? loginAction : registerAction,
    {},
  );
  const copy = COPY[mode];
  const v = state.values ?? {};
  const err = state.fields ?? {};
  const altHref = next ? `${copy.alt.href}?next=${encodeURIComponent(next)}` : copy.alt.href;

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lead}>{copy.lead}</p>
      </header>

      <form action={formAction} className={styles.form} noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <FormSuccess message={state.message ? undefined : notice} />
        <FormError message={state.message} />

        {mode === 'register' && (
          <Field
            name="displayName"
            label="¿Cómo te conocen en la comunidad?"
            autoComplete="nickname"
            defaultValue={v.displayName}
            error={err.displayName}
            maxLength={40}
          />
        )}

        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={v.email}
          error={err.email}
          hint={mode === 'register' ? 'Nunca se muestra a otros vecinos.' : undefined}
        />

        <Field
          name="password"
          label="Contraseña"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          error={err.password}
          hint={mode === 'register' ? 'Mínimo 8 caracteres, con letras y números.' : undefined}
          maxLength={72}
        />

        {mode === 'login' && (
          <p className={styles.forgot}>
            <Link href="/olvide">¿Olvidaste tu contraseña?</Link>
          </p>
        )}

        {mode === 'register' && (
          <Field
            name="neighborhood"
            label="Tu colonia (opcional)"
            autoComplete="address-level3"
            defaultValue={v.neighborhood}
            error={err.neighborhood}
            maxLength={80}
          />
        )}

        {mode === 'register' && (
          <CheckboxField name="acceptTerms" error={err.acceptTerms}>
            Acepto los{' '}
            <Link href="/terminos" target="_blank">
              términos de uso
            </Link>{' '}
            y el{' '}
            <Link href="/privacidad" target="_blank">
              aviso de privacidad
            </Link>
            .
          </CheckboxField>
        )}

        <SubmitButton pending={pending} pendingLabel={copy.pending}>
          {copy.submit}
        </SubmitButton>
      </form>

      <p className={styles.alt}>
        {copy.alt.text} <Link href={altHref}>{copy.alt.link}</Link>
      </p>
    </div>
  );
}
