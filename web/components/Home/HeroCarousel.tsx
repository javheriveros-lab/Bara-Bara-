'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronIcon } from '../icons';
import styles from './Home.module.css';

type Slide = {
  title: string;
  text: string;
  cta: { label: string; href: string };
  /** Collage fanzine (web/public/carousel), hecho con fotos Creative Commons. */
  collage: { src: string; alt: string; credit: string; creditHref: string };
  /** Ideas prácticas para aprovechar lo que dice la leyenda de la izquierda. */
  tips: string[];
  tone: 'violet' | 'red' | 'magenta' | 'indigo';
};

const SLIDES: Slide[] = [
  {
    title: 'Compra, renta e intercambia con tu comunidad',
    text: 'Todo cerca de ti, sin especulación ni comisiones abusivas.',
    cta: { label: 'Explorar', href: '/buscar' },
    collage: {
      src: 'comunidad',
      alt: 'Collage de vecinos recorriendo un tianguis y una señora comprando en el mercado',
      credit: 'Fotos: Carl Campbell (CC BY-SA 2.0), Eneas (CC BY 2.0). Collage CC BY-SA 2.0',
      creditHref: 'https://www.flickr.com/photos/10404073@N05/3338299845',
    },
    tips: [
      'Busca por tu colonia y encuentra lo que está cerca.',
      'Guarda lo que te gusta y compara antes de decidir.',
      'Negocia por chat y quedan en un lugar público.',
    ],
    tone: 'violet',
  },
  {
    title: 'Intercambia sin dinero',
    text: 'El intercambio no paga comisión. Di qué ofreces y qué buscas.',
    cta: { label: 'Ver intercambios', href: '/buscar?tipo=intercambio' },
    collage: {
      src: 'intercambio',
      alt: 'Collage de personas intercambiando ropa en un bazar comunitario',
      credit: 'Fotos: Neesa Rajbhandari / The S.W.A.P. Team (CC BY-SA 2.0), blmurch (CC BY 2.0). Collage CC BY-SA 2.0',
      creditHref: 'https://commons.wikimedia.org/w/index.php?curid=15879085',
    },
    tips: [
      'Di claro qué ofreces y qué buscas a cambio.',
      'Fotos con buena luz atraen más propuestas.',
      'Intercambiar nunca paga comisión.',
    ],
    tone: 'magenta',
  },
  {
    title: 'Publica gratis',
    text: 'Solo pagas 5% cuando cierras un trato de venta, renta o servicio.',
    cta: { label: 'Publicar', href: '/publicar' },
    collage: {
      src: 'publica',
      alt: 'Collage de una venta de garage y un bazar con vecinos ofreciendo sus cosas',
      credit: 'Fotos: John Beagle (CC BY 2.0), di bo di (CC BY 2.0). Collage CC BY-SA 2.0',
      creditHref: 'https://www.flickr.com/photos/32575263@N00/2559363502',
    },
    tips: [
      'Publicar no cuesta: el 5% solo aplica si cierras.',
      'Sube varias fotos y pon un precio justo.',
      'Responde rápido en el chat para cerrar antes.',
    ],
    tone: 'red',
  },
  {
    title: 'Tu oficio, para tu comunidad',
    text: 'Plomería, electricidad, cocina o clases: tus vecinos te buscan.',
    cta: { label: 'Ver servicios', href: '/buscar?tipo=servicios' },
    collage: {
      src: 'oficio',
      alt: 'Collage de un plomero trabajando bajo el fregadero de una cocina',
      credit: 'Foto: rick (CC BY 2.0). Collage CC BY-SA 2.0',
      creditHref: 'https://commons.wikimedia.org/w/index.php?curid=1613365',
    },
    tips: [
      'Describe tu oficio y la zona donde trabajas.',
      'Pon un precio claro o elige «a cotizar».',
      'Verifica tu INE para ganar más confianza.',
    ],
    tone: 'indigo',
  },
];

const AUTOPLAY_MS = 6500;

/**
 * Carrusel principal (como el de los grandes marketplaces), con mensajes reales de Bara Bara.
 * Base: scroll-snap nativo (funciona sin JS y con el dedo). Con JS: flechas, puntos y avance
 * automático que se pausa al pasar el cursor, al enfocar, con la pestaña oculta o con
 * "reducir movimiento".
 */
export function HeroCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + SLIDES.length) % SLIDES.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  }, []);

  // Punto activo según la posición del scroll (también al deslizar con el dedo).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!paused.current && document.visibilityState === 'visible') go(index + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [index, go]);

  const pause = (v: boolean) => () => {
    paused.current = v;
  };

  return (
    <section
      className={styles.hero}
      aria-roledescription="carrusel"
      aria-label="Destacados"
      onPointerEnter={pause(true)}
      onPointerLeave={pause(false)}
      onFocus={pause(true)}
      onBlur={pause(false)}
    >
      <div ref={track} className={styles.heroTrack}>
        {SLIDES.map((s, i) => (
          <article
            key={s.title}
            className={styles.slide}
            data-tone={s.tone}
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${SLIDES.length}`}
          >
            <div className={styles.slideInner}>
              <div className={styles.slideCopy}>
                <h2 className={styles.slideTitle}>{s.title}</h2>
                <p className={styles.slideText}>{s.text}</p>
                <Link href={s.cta.href} className={styles.slideCta} tabIndex={i === index ? 0 : -1}>
                  {s.cta.label}
                </Link>
              </div>
              {/* Zona visual: collage fanzine + ideas prácticas sobre el papel, abajo. */}
              <figure className={styles.slideVisual}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/carousel/${s.collage.src}.webp`}
                  srcSet={`/carousel/${s.collage.src}-400.webp 400w, /carousel/${s.collage.src}.webp 720w`}
                  sizes="(max-width: 860px) 92vw, 500px"
                  alt={s.collage.alt}
                  width={720}
                  height={560}
                  className={styles.collage}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  decoding="async"
                />
                <ul className={styles.tips} aria-label="Cómo aprovecharlo">
                  {s.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <figcaption className={styles.credit}>
                  <a href={s.collage.creditHref} target="_blank" rel="noopener noreferrer license" tabIndex={i === index ? 0 : -1}>
                    {s.collage.credit}
                  </a>
                </figcaption>
              </figure>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className={`${styles.heroArrow} ${styles.heroPrev}`} onClick={() => go(index - 1)} aria-label="Anterior">
        <ChevronIcon size={22} direction="left" />
      </button>
      <button type="button" className={`${styles.heroArrow} ${styles.heroNext}`} onClick={() => go(index + 1)} aria-label="Siguiente">
        <ChevronIcon size={22} direction="right" />
      </button>

      <div className={styles.dots}>
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className={styles.dot}
            data-active={i === index ? '' : undefined}
            aria-label={`Ir a la diapositiva ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}
