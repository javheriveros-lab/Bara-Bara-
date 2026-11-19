'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ownerItemAction } from '@/lib/account-actions';
import type { FormState } from '@/lib/form-state';
import styles from '../perfil.module.css';

interface Props {
  id: string;
  /** "p" publicación, "s" servicio. */
  kind: 'p' | 's';
  status: string;
  closeLabel: string;
}

/** Botones del dueño: editar, pausar/reactivar, cerrar y borrar. Funcionan sin JS salvo la confirmación. */
export function OwnerActions({ id, kind, status, closeLabel }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(ownerItemAction, {});

  return (
    <form action={action} className={styles.ownerActions} aria-busy={pending}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <Link href={`/publicar/editar/${id}?tipo=${kind}`} className={styles.chip}>
        Editar
      </Link>
      {status === 'ACTIVE' && (
        <button type="submit" name="op" value="PAUSED" className={styles.chip} disabled={pending}>
          Pausar
        </button>
      )}
      {(status === 'PAUSED' || status === 'CLOSED') && (
        <button type="submit" name="op" value="ACTIVE" className={styles.chip} disabled={pending}>
          Reactivar
        </button>
      )}
      {(status === 'ACTIVE' || status === 'PAUSED') && (
        <button type="submit" name="op" value="CLOSED" className={styles.chip} disabled={pending}>
          {closeLabel}
        </button>
      )}
      <button
        type="submit"
        name="op"
        value="delete"
        className={styles.chipDanger}
        disabled={pending}
        onClick={(e) => {
          if (!confirm('¿Borrar esta publicación? No se puede deshacer.')) e.preventDefault();
        }}
      >
        Borrar
      </button>
      {state.message && (
        <p className={styles.danger} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
