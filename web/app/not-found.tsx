import type { Metadata } from 'next';
import Link from 'next/link';
import { SignalIcon } from '@/components/Punk/SignalIcon';
import styles from '@/components/Punk/Punk.module.css';

export const metadata: Metadata = { title: 'No encontrado · Bara Bara', robots: { index: false } };

/** 404 propia: misma estética de cartel urbano, con salidas claras. */
export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px 72px' }}>
      <section className={styles.panel}>
        <span className={styles.tag}>404 · calle sin salida</span>
        <SignalIcon />
        <p className={styles.panelText}>Esto ya no está aquí.</p>
        <p className={styles.panelMeta}>Puede que la publicación se haya vendido, pausado o borrado.</p>
        <Link href="/" className={styles.stampButton}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
