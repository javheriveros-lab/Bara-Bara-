'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleSavedAction, type SavedKind } from '@/lib/saved-actions';
import { CartIcon } from '../icons';
import styles from './SaveButton.module.css';

/**
 * Guardar en "Guardados" (el carrito de Bara Bara). Optimista: cambia al instante y, si la API
 * falla, regresa y avisa. Sin sesión lleva a entrar.
 */
export function SaveButton({
  kind,
  id,
  initialSaved,
  loggedIn,
}: {
  kind: SavedKind;
  id: string;
  initialSaved: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    setError('');
    startTransition(async () => {
      const res = await toggleSavedAction(kind, id, next);
      if (!res.ok) {
        setSaved(!next);
        setError(res.message);
        return;
      }
      router.refresh(); // actualiza el contador del carrito en el header
    });
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        data-saved={saved ? '' : undefined}
        aria-pressed={saved}
        onClick={toggle}
        disabled={pending}
      >
        <CartIcon size={20} />
        {saved ? 'Guardado' : 'Guardar'}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
