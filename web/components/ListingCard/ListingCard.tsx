import Image from 'next/image';
import Link from 'next/link';
import { CARD_KIND_LABEL, type CardKind } from '@bara/shared';
import { formatMoney } from '@/lib/format';
import styles from './ListingCard.module.css';

export interface ListingCardProps {
  kind: CardKind;
  title: string;
  href: string;
  neighborhood: string;
  imageUrl?: string;
  /** Precio en MXN. Si falta en SALE/RENT/SERVICE se muestra "A cotizar". */
  price?: number;
  /** Sufijo del precio: "/día", "/hora"… */
  priceSuffix?: string;
  /** Solo para BARTER: lo que el vecino busca a cambio. */
  barterWants?: string[];
  owner: {
    name: string;
    verified: boolean;
    rating?: number;
  };
}

export function ListingCard({
  kind,
  title,
  href,
  neighborhood,
  imageUrl,
  price,
  priceSuffix,
  barterWants,
  owner,
}: ListingCardProps) {
  const kindLabel = CARD_KIND_LABEL[kind];

  return (
    <Link
      href={href}
      className={styles.card}
      data-kind={kind}
    >
      <div className={styles.media}>
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="(max-width: 480px) 50vw, (max-width: 860px) 33vw, 280px" className={styles.image} />
        ) : (
          <div className={styles.placeholder} aria-hidden />
        )}
      </div>

      <div className={styles.body}>
        <span className={styles.kind}>{kindLabel}</span>
        <h3 className={styles.title}>{title}</h3>

        {kind === 'BARTER' ? (
          <p className={styles.wants}>
            <span className={styles.wantsLabel}>Busca</span>
            {barterWants?.length ? barterWants.join(' · ') : 'Propuestas'}
          </p>
        ) : (
          <p className={styles.price}>
            {price != null ? formatMoney(price) : 'A cotizar'}
            {price != null && priceSuffix && <span className={styles.suffix}>{priceSuffix}</span>}
          </p>
        )}

        <footer className={styles.meta}>
          <span className={styles.owner}>
            <span className={styles.ownerName}>{owner.name}</span>
            {owner.verified && (
              <span className={styles.verified} title="Identidad y domicilio verificados">
                <CheckIcon />
                <span className={styles.srOnly}>Verificado</span>
              </span>
            )}
          </span>
          <span className={styles.place}>
            {owner.rating != null && (
              <span className={styles.rating}>
                <StarIcon />
                {owner.rating.toFixed(1)}
              </span>
            )}
            <span className={styles.hood}>{neighborhood}</span>
          </span>
        </footer>
      </div>
    </Link>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden className={styles.star}>
      <path
        d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 1.5 13.5 4v4c0 3.2-2.3 5.6-5.5 6.5C4.8 13.6 2.5 11.2 2.5 8V4L8 1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="m5.5 8 1.8 1.8L10.8 6.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
