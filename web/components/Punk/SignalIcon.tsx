import styles from './Punk.module.css';

/** Antena con barras de señal tachada: trazo fino violeta con brillo, como esténcil de neón. */
export function SignalIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={styles.signalIcon} aria-hidden>
      <path d="M32 54V30" />
      <path d="M24 54h16" />
      <path d="M22 22a14 14 0 0 1 20 0" />
      <path d="M15 15a24 24 0 0 1 34 0" />
      <circle cx="32" cy="28" r="2.5" />
      <path d="M12 52 52 12" className={styles.signalSlash} />
    </svg>
  );
}
