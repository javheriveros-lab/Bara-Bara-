'use client';

import { useActionState } from 'react';
import { Field, FormError, FormSuccess, SubmitButton } from '@/components/form/Field';
import { changePasswordAction, updateProfileAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from '../perfil.module.css';

export function ProfileForm({ displayName, neighborhood }: { displayName: string; neighborhood: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  const v = state.values ?? { displayName, neighborhood };
  return (
    <form action={action} className={styles.stack} noValidate>
      <FormSuccess message={state.ok} />
      <FormError message={state.message} />
      <Field
        name="displayName"
        label="¿Cómo te conocen en la comunidad?"
        autoComplete="nickname"
        defaultValue={v.displayName}
        error={state.fields?.displayName}
        maxLength={40}
      />
      <Field
        name="neighborhood"
        label="Tu colonia"
        autoComplete="address-level3"
        defaultValue={v.neighborhood}
        error={state.fields?.neighborhood}
        hint="Déjala vacía si prefieres no mostrarla."
        maxLength={80}
      />
      <SubmitButton pending={pending} pendingLabel="Guardando…">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  // Al cambiar con éxito se vacían los campos (key nueva).
  return (
    <form key={state.ok ? 'done' : 'edit'} action={action} className={styles.stack} noValidate>
      <FormSuccess message={state.ok} />
      <FormError message={state.message} />
      <Field
        name="currentPassword"
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        error={state.fields?.currentPassword}
        maxLength={72}
      />
      <Field
        name="newPassword"
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        error={state.fields?.newPassword}
        hint="Mínimo 8 caracteres, con letras y números."
        maxLength={72}
      />
      <Field
        name="confirm"
        label="Repite la nueva"
        type="password"
        autoComplete="new-password"
        error={state.fields?.confirm}
        maxLength={72}
      />
      <SubmitButton pending={pending} pendingLabel="Guardando…">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}
