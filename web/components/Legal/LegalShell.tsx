import Link from 'next/link';
import { isLegalComplete, LEGAL } from '@/lib/legal';
import styles from './Legal.module.css';

const PAGES = [
  { href: '/terminos', label: 'Términos' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/contacto', label: 'Contacto' },
] as const;

/** Marco común de las páginas legales: navegación, título, fecha y aviso de borrador. */
export function LegalShell({ current, title, children }: { current: string; title: string; children: React.ReactNode }) {
  return (
    <main className={styles.main}>
      <nav className={styles.toc} aria-label="Documentos legales">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined}>
            {p.label}
          </Link>
        ))}
      </nav>
      <article className={styles.doc}>
        {!isLegalComplete() && (
          <p className={styles.draft} role="note">
            Borrador: faltan datos del responsable. Configura NEXT_PUBLIC_LEGAL_NAME, NEXT_PUBLIC_LEGAL_ADDRESS y
            NEXT_PUBLIC_CONTACT_EMAIL antes de abrir al público.
          </p>
        )}
        <h1>{title}</h1>
        <p className={styles.updated}>
          Última actualización: {LEGAL.updated} · versión {LEGAL.version}
        </p>
        {children}
      </article>
    </main>
  );
}
