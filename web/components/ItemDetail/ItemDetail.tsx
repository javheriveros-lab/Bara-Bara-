import { CARD_KIND_LABEL, formatRate, isVerified, splitAmount, type CardKind, type PublicUser } from '@bara/shared';
import Image from 'next/image';
import Link from 'next/link';
import { ReliableIcon, ShieldCheckIcon } from '@/components/icons';
import { SaveButton } from '@/components/SaveButton/SaveButton';
import { OwnerActions } from '@/app/perfil/publicaciones/OwnerActions';
import { ReportButton } from './ReportButton';
import { startConversationAction } from '@/lib/chat-actions';
import { formatMoney } from '@/lib/format';
import styles from './ItemDetail.module.css';

export interface ItemDetailProps {
  kind: CardKind;
  title: string;
  images: string[];
  /** Precio principal ya formateado ("$120", "A cotizar"…). */
  price?: string;
  priceSuffix?: string;
  /** Monto sobre el que se calcula la comisión (precio o tarifa; null si es a cotizar o intercambio). */
  commissionBase?: number | null;
  /** Datos clave: condición, depósito, cobertura… */
  facts: { label: string; value: string }[];
  /** Solo intercambio: lo que busca a cambio. */
  wants?: string[];
  description: string;
  neighborhood: string;
  person: PublicUser;
  personRole: string;
  createdAt: string;
  negotiate: NegotiateProps;
  /** Ya está en los Guardados del vecino. */
  saved?: boolean;
  /** ACTIVE, RESERVED, PAUSED o CLOSED. */
  status: string;
  /** Texto del botón "cerrar" para el dueño (Vendida, Intercambiada…). */
  closeLabel: string;
}

export interface NegotiateProps {
  target: { listingId: string } | { serviceId: string };
  /** Ruta del detalle, para volver tras iniciar sesión. */
  back: string;
  viewer: 'guest' | 'owner' | 'neighbor';
}

const NEGOTIATE_LABEL: Record<CardKind, string> = {
  SALE: 'Negociar',
  RENT: 'Rentar',
  BARTER: 'Proponer intercambio',
  SERVICE: 'Pedir el servicio',
};

const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' });

export function ItemDetail(props: ItemDetailProps) {
  const { kind, title, images, price, priceSuffix, facts, wants, description, neighborhood, person, personRole } = props;
  const verified = isVerified(person);
  const targetKind = 'listingId' in props.negotiate.target ? 'p' : 's';
  const targetId = 'listingId' in props.negotiate.target ? props.negotiate.target.listingId : props.negotiate.target.serviceId;
  const available = props.status === 'ACTIVE' || props.status === 'RESERVED';

  return (
    <article className={styles.layout}>
      <div className={styles.media}>
        {images.length > 0 ? (
          <ul className={styles.gallery} aria-label={`Fotos (${images.length})`}>
            {images.map((src, i) => (
              <li key={src} className={styles.slide}>
                <Image
                  src={src}
                  alt={`${title}, foto ${i + 1} de ${images.length}`}
                  fill
                  sizes="(max-width: 860px) 100vw, 560px"
                  priority={i === 0}
                  className={styles.image}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.placeholder} aria-hidden />
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.tags}>
          <span className={styles.kind}>{CARD_KIND_LABEL[kind]}</span>
          {kind === 'BARTER' && <span className={styles.free}>Sin comisión</span>}
        </p>
        <h1 className={styles.title}>{title}</h1>

        {wants ? (
          <p className={styles.wants}>
            <span>Busca a cambio</span>
            {wants.join(' · ')}
          </p>
        ) : (
          <p className={styles.price}>
            {price}
            {priceSuffix && <span className={styles.suffix}>{priceSuffix}</span>}
          </p>
        )}

        {facts.length > 0 && (
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className={styles.description}>{description}</p>

        {props.negotiate.viewer === 'owner' ? (
          <>
            <Negotiate kind={kind} commissionBase={props.commissionBase} {...props.negotiate} />
            {props.status === 'RESERVED' ? (
              <p className={styles.negotiateNote}>Está apartada por un trato en curso.</p>
            ) : (
              <OwnerActions id={targetId} kind={targetKind} status={props.status} closeLabel={props.closeLabel} />
            )}
          </>
        ) : available ? (
          <Negotiate kind={kind} commissionBase={props.commissionBase} {...props.negotiate} />
        ) : (
          <p className={styles.unavailable}>Esta publicación ya no está disponible.</p>
        )}
        {props.negotiate.viewer !== 'owner' && (
          <SaveButton
            kind={'listingId' in props.negotiate.target ? 'listing' : 'service'}
            id={'listingId' in props.negotiate.target ? props.negotiate.target.listingId : props.negotiate.target.serviceId}
            initialSaved={props.saved ?? false}
            loggedIn={props.negotiate.viewer !== 'guest'}
          />
        )}

        <section className={styles.person} aria-label={personRole}>
          <span className={styles.avatar} aria-hidden>
            {person.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className={styles.personText}>
            <p className={styles.personName}>
              {person.displayName}
              {verified && (
                <span className={styles.verified} title="Identidad y domicilio verificados">
                  <ShieldCheckIcon size={16} />
                  <span>Verificado</span>
                </span>
              )}
              {person.reliablePayer && (
                <span className={styles.verified} title="Paga sus comisiones a tiempo">
                  <ReliableIcon size={16} />
                  <span>Vecino Confiable</span>
                </span>
              )}
            </p>
            <p className={styles.personMeta}>
              {personRole} · {neighborhood}
              {person.reviewCount > 0 && ` · ★ ${person.reputationScore.toFixed(1)} (${person.reviewCount})`}
            </p>
          </div>
        </section>

        <p className={styles.date}>Publicado el {dateFmt.format(new Date(props.createdAt))}</p>
        {props.negotiate.viewer !== 'owner' && (
          <ReportButton id={targetId} kind={targetKind} loggedIn={props.negotiate.viewer !== 'guest'} back={props.negotiate.back} />
        )}
      </div>
    </article>
  );
}

function Negotiate({
  kind,
  target,
  back,
  viewer,
  commissionBase,
}: NegotiateProps & { kind: CardKind; commissionBase?: number | null }) {
  const label = NEGOTIATE_LABEL[kind];

  if (viewer === 'owner') {
    return (
      <p className={styles.ownerNote}>
        Es tu publicación · <Link href="/mensajes">Ver mensajes</Link>
        <br />
        <OwnerCommission kind={kind} base={commissionBase} />
      </p>
    );
  }
  if (viewer === 'guest') {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(back)}`} className={styles.negotiate}>
        {`Entra para ${label.toLowerCase()}`}
      </Link>
    );
  }
  return (
    <form action={startConversationAction}>
      {'listingId' in target ? (
        <input type="hidden" name="listingId" value={target.listingId} />
      ) : (
        <input type="hidden" name="serviceId" value={target.serviceId} />
      )}
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={styles.negotiate}>
        {label}
      </button>
      <p className={styles.negotiateNote}>Chatea directo. Tu email y teléfono nunca se comparten.</p>
    </form>
  );
}

/** Solo el dueño ve cuánto recibe: el comprador paga el precio publicado. */
function OwnerCommission({ kind, base }: { kind: CardKind; base?: number | null }) {
  if (kind === 'BARTER') return <>El intercambio no paga comisión.</>;
  if (!base) return <>Al cerrar el trato, Bara Bara cobra 5% del precio acordado.</>;
  const split = splitAmount(kind, base);
  return (
    <>
      A este precio recibes <strong>{formatMoney(split.net)}</strong> (comisión Bara Bara {formatRate(split.rate)}:{' '}
      {formatMoney(split.commission)}){kind === 'RENT' && '. La fianza no paga comisión'}.
    </>
  );
}
