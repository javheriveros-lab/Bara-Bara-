'use client';

import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';

/**
 * Framer Motion para toda la app:
 *  - LazyMotion + `m`: solo carga las funciones de animación que usamos (más liviano en celulares).
 *  - reducedMotion="user": si el sistema pide reducir movimiento, se omiten los desplazamientos.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Resorte compartido estilo Apple: críticamente amortiguado (sin rebote), respuesta de 0.4 s. */
export const SPRING_SNAP = { type: 'spring', bounce: 0, duration: 0.4 } as const;
