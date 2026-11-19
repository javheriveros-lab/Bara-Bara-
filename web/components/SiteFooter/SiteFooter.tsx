import Link from 'next/link';
import styles from './SiteFooter.module.css';

const COLUMNS = [
  {
    title: 'Explora',
    links: [
      { label: 'Venta', href: '/buscar?tipo=venta' },
      { label: 'Renta', href: '/buscar?tipo=renta' },
      { label: 'Intercambio', href: '/buscar?tipo=intercambio' },
      { label: 'Servicios', href: '/buscar?tipo=servicios' },
    ],
  },
  {
    title: 'Tu cuenta',
    links: [
      { label: 'Publicar', href: '/publicar' },
      { label: 'Guardados', href: '/guardados' },
      { label: 'Mis tratos', href: '/mensajes' },
      { label: 'Mi perfil', href: '/perfil' },
    ],
  },
  {
    title: 'Confianza',
    links: [
      { label: 'Verificar mi identidad', href: '/perfil/verificacion' },
      { label: 'Mis comisiones', href: '/perfil/comisiones' },
      { label: 'Crear cuenta', href: '/registro' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de uso', href: '/terminos' },
      { label: 'Aviso de privacidad', href: '/privacidad' },
      { label: 'Contacto', href: '/contacto' },
    ],
  },
];

/** Pie de la tienda: enlaces por tema y la nota de la comunidad. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-white.webp" alt="¡Bara Bara!" width={156} height={40} loading="lazy" decoding="async" />
          <p>Economía colaborativa de la comunidad: compra, renta, intercambia y contrata servicios cerca de ti.</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} className={styles.col} aria-label={c.title}>
            <p className={styles.colTitle}>{c.title}</p>
            <ul>
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className={styles.legal}>© {new Date().getFullYear()} Bara Bara. Intercambio sin comisión; 5% solo al cerrar tratos de venta, renta o servicios.</p>
    </footer>
  );
}
