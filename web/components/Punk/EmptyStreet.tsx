import Link from 'next/link';
import { SignalIcon } from './SignalIcon';
import styles from './Punk.module.css';

/** Sin resultados en esta sección: el mismo cartel urbano, con invitación a publicar. */
export function EmptyStreet({ section }: { section?: string }) {
  return (
    <section className={styles.panel}>
      <span className={styles.tag}>{section ? `${section} · vacío` : 'Sin publicaciones'}</span>
      <SignalIcon />
      <p className={styles.panelText}>Zona sin señal, pero la comunidad sigue conectada.</p>
      <p className={styles.panelMeta}>Sé la primera persona en publicar aquí</p>
      <Link href="/publicar" className={styles.stampButton}>
        Publicar
      </Link>
    </section>
  );
}
