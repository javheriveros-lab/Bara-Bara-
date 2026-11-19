'use client';

import { m, type Variants } from 'framer-motion';
import { Children } from 'react';
import { SPRING_SNAP } from './MotionProvider';
import styles from './Motion.module.css';

/** La sección entra con un deslizamiento corto y preciso; las tarjetas, en cascada rápida.
 *  La elevación al pasar el cursor y la presión viven en CSS (ListingCard): corren en el compositor. */
const section: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { ...SPRING_SNAP, staggerChildren: 0.04, delayChildren: 0.03 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_SNAP },
};

/**
 * Rejilla del feed animada. Las tarjetas llegan del servidor como hijos (siguen siendo
 * componentes de servidor); aquí solo se envuelven para animarlas.
 * Sin JavaScript, layout.tsx anula el estado oculto inicial (clase motion-feed).
 */
export function MotionFeed({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <div className={styles.stage}>
      <m.section className={`${className ?? ''} motion-feed`} aria-label={label} variants={section} initial="hidden" animate="show">
        {Children.map(children, (child) => (
          <m.div className={styles.cutout} variants={card}>
            {child}
          </m.div>
        ))}
      </m.section>
    </div>
  );
}
