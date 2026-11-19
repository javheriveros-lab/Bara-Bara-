'use client';

import { LISTING_CATEGORIES } from '@bara/shared';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ChevronIcon } from '../icons';
import styles from './CategoriesMenu.module.css';

/** "Categorías ▾" de la barra de navegación. Es un <details>: funciona sin JS; con JS cierra al tocar fuera o con Escape. */
export function CategoriesMenu() {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const el = menu.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  const closeMenu = () => menu.current?.removeAttribute('open');

  return (
    <details ref={menu} className={styles.menu}>
      <summary className={styles.trigger}>
        Categorías
        <ChevronIcon size={16} />
      </summary>
      <div className={styles.panel}>
        <ul className={styles.list}>
          {LISTING_CATEGORIES.map((c) => (
            <li key={c}>
              <Link href={`/buscar?categoria=${encodeURIComponent(c)}`} onClick={closeMenu}>
                {c}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/buscar?tipo=servicios" onClick={closeMenu}>
              Servicios
            </Link>
          </li>
        </ul>
      </div>
    </details>
  );
}
