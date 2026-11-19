'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import { FEED_FILTERS, feedFilterFromSlug, type FeedSlug } from '@/lib/kinds';
import styles from './PillarNav.module.css';

/** Los 4 pilares en la barra superior: abren `/buscar?tipo=`. La sección activa sale de la URL. */
export function PillarNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = pathname === '/buscar' ? feedFilterFromSlug(params.get('tipo'))?.slug : undefined;
  return <PillarLinks active={active} />;
}

/**
 * Enlaces normales (funcionan sin JS). Con JS, una línea de degradado se desliza hasta la
 * sección activa y la pestaña que está cargando parpadea. Tocar la activa vuelve a mostrar todo.
 */
export function PillarLinks({ active }: { active?: FeedSlug }) {
  const navRef = useRef<HTMLElement>(null);
  const [mark, setMark] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const el = nav.querySelector<HTMLElement>('[aria-current="page"]');
      setMark(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav ref={navRef} className={styles.nav} aria-label="Secciones">
      <span
        className={styles.mark}
        aria-hidden
        data-visible={mark ? '' : undefined}
        style={mark ? { transform: `translateX(${mark.x}px)`, width: mark.w } : undefined}
      />
      {FEED_FILTERS.map((f) => {
        const isActive = active === f.slug;
        return (
          <Link
            key={f.slug}
            href={isActive ? '/buscar' : `/buscar?tipo=${f.slug}`}
            className={styles.link}
            aria-current={isActive ? 'page' : undefined}
            title={isActive ? 'Ver todo' : undefined}
          >
            <span className={styles.label}>{f.label}</span>
            <Pending />
          </Link>
        );
      })}
    </nav>
  );
}

/** Chispa que parpadea mientras la sección elegida se carga. */
function Pending() {
  const { pending } = useLinkStatus();
  return <span className={styles.spark} data-pending={pending ? '' : undefined} aria-hidden />;
}
