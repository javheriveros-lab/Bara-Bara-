'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronIcon } from '../icons';
import styles from './Home.module.css';

/**
 * Fila horizontal de tarjetas: scroll-snap nativo (dedo, trackpad, teclado). Las flechas solo
 * aparecen cuando hay más tarjetas hacia ese lado.
 */
export function RowScroller({ children, label }: { children: React.ReactNode; label: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={styles.rowWrap}>
      <ul ref={track} className={styles.rowTrack} aria-label={label}>
        {children}
      </ul>
      {!edges.start && (
        <button type="button" className={`${styles.rowArrow} ${styles.rowPrev}`} onClick={() => move(-1)} aria-label="Ver anteriores">
          <ChevronIcon size={20} direction="left" />
        </button>
      )}
      {!edges.end && (
        <button type="button" className={`${styles.rowArrow} ${styles.rowNext}`} onClick={() => move(1)} aria-label="Ver más">
          <ChevronIcon size={20} direction="right" />
        </button>
      )}
    </div>
  );
}
