'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { SignalIcon } from './SignalIcon';
import styles from './Punk.module.css';

const RETRY_EVERY_S = 10;

/**
 * Sin señal (API caída, red móvil intermitente u offline): cartel urbano limpio. Reintenta solo
 * cada 10 s y al recuperar conexión; el botón amarillo reintenta ya. Con `onRetry` (error.tsx) usa ese reset.
 */
export function SignalLost({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [left, setLeft] = useState(RETRY_EVERY_S);

  const retry = useCallback(() => {
    setLeft(RETRY_EVERY_S);
    startTransition(() => {
      router.refresh();
      onRetry?.();
    });
  }, [router, onRetry]);

  useEffect(() => {
    const tick = setInterval(() => setLeft((s) => s - 1), 1000);
    window.addEventListener('online', retry);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', retry);
    };
  }, [retry]);

  useEffect(() => {
    if (left > 0) return;
    // Sin conexión no tiene caso pedir: se espera al evento "online".
    if (navigator.onLine) retry();
    else setLeft(RETRY_EVERY_S);
  }, [left, retry]);

  return (
    <section className={styles.panel} role="alert">
      <span className={styles.tag}>Zona sin señal</span>
      <SignalIcon />
      <p className={styles.panelText}>Zona sin señal, pero la comunidad sigue conectada.</p>
      <button type="button" className={styles.stampButton} onClick={retry} disabled={pending}>
        {pending ? 'Reconectando…' : 'Reintentar'}
      </button>
      <p className={styles.panelMeta} aria-live="off" suppressHydrationWarning>
        {pending ? 'Reintentando…' : `Reintentando en ${left} s`}
      </p>
    </section>
  );
}
