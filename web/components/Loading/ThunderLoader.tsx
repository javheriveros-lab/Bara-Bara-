import styles from './ThunderLoader.module.css';

// Rayo en dos formas que se alternan (vibración). viewBox 0 0 100 1000; impacto abajo al centro.
const BOLT_A = {
  main: 'M52 0 L44 120 L58 230 L40 360 L55 470 L38 600 L56 720 L44 850 L50 1000',
  branches: ['M40 360 L22 430 L28 470', 'M56 720 L78 790 L72 840', 'M58 230 L74 290'],
};
const BOLT_B = {
  main: 'M50 0 L58 130 L42 240 L57 350 L41 480 L58 590 L42 730 L55 860 L50 1000',
  branches: ['M57 350 L76 410', 'M42 730 L24 800 L30 850', 'M41 480 L26 520'],
};

function Bolt({ shape, className }: { shape: typeof BOLT_A; className: string }) {
  return (
    <g className={className}>
      {[shape.main, ...shape.branches].map((d, i) => (
        <g key={d} className={i === 0 ? styles.trunk : styles.branch}>
          <path d={d} className={styles.boltOuter} />
          <path d={d} className={styles.boltCore} />
        </g>
      ))}
    </g>
  );
}

export type ThunderVariant = 'screen' | 'overlay' | 'card';

/**
 * Motion graphic de carga "Esfera y trueno": el logo completo aparece; en bucle, un rayo amarillo
 * cae sobre la esfera, el impacto destella y la esfera se recarga en neón violeta. Sigue mientras
 * el componente esté montado (quien lo usa lo desmonta cuando termina la carga).
 *
 * Escala con su contenedor (container queries): sirve igual a pantalla completa que dentro de una
 * tarjeta. Solo CSS sobre transform/opacity (compositor, 60 fps), sin JS.
 */
export function ThunderLoader({ variant, label }: { variant: ThunderVariant; label: string }) {
  return (
    <div className={styles.stage} data-variant={variant} role="status" aria-live="polite">
      <span className={styles.srOnly}>{label}</span>
      <span className={styles.flash} aria-hidden />
      <div className={styles.logoWrap} aria-hidden>
        <span className={styles.glow} />
        <svg className={styles.bolt} viewBox="0 0 100 1000" preserveAspectRatio="none">
          <Bolt shape={BOLT_A} className={styles.shapeA} />
          <Bolt shape={BOLT_B} className={styles.shapeB} />
        </svg>
        {/* Logo oficial en blanco, base de la esfera roja y rayo amarillo. Estático: sin loader de imágenes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-splash-white-800.webp"
          srcSet="/brand/logo-splash-white-480.webp 480w, /brand/logo-splash-white-800.webp 800w"
          sizes={variant === 'card' ? '260px' : '(max-width: 600px) 80vw, 420px'}
          alt=""
          width={800}
          height={481}
          className={styles.logo}
          loading={variant === 'card' ? 'lazy' : undefined}
          decoding="async"
        />
        <span className={styles.charge} />
        <svg className={styles.ring} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" pathLength={100} />
        </svg>
      </div>
      {variant !== 'card' && (
        <p className={styles.caption} aria-hidden>
          {label}
        </p>
      )}
    </div>
  );
}

/** Carga de página o de proceso: ocupa la pantalla bajo el header ("screen") o la cubre ("overlay"). */
export function LoadingSpinner({
  variant = 'screen',
  label = 'Cargando la comunidad…',
}: {
  variant?: 'screen' | 'overlay';
  label?: string;
}) {
  return <ThunderLoader variant={variant} label={label} />;
}

/** Marcador de posición de una tarjeta de producto mientras llega el grid. */
export function CardSkeletonLoader() {
  return (
    <div className={styles.ghostCard} aria-hidden>
      <ThunderLoader variant="card" label="Cargando publicación" />
      <div className={styles.ghostBody}>
        <span className={styles.ghostLine} data-w="70" />
        <span className={styles.ghostLine} data-w="40" />
        <span className={styles.ghostLine} data-w="90" data-thin />
      </div>
    </div>
  );
}

/** Grid de tarjetas cargando (fallback del feed y de cada cambio de pilar). */
export function FeedSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.grid} role="status" aria-label="Cargando publicaciones">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeletonLoader key={i} />
      ))}
    </div>
  );
}
