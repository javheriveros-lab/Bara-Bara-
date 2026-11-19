import { LISTING_CATEGORIES, type SelfUser } from '@bara/shared';
import Image from 'next/image';
import Link from 'next/link';
import { ListingCard, type ListingCardProps } from '@/components/ListingCard';
import { CartIcon, ChatIcon, PinIcon, ShieldCheckIcon, SwapIcon, TagIcon, UserIcon } from '../icons';
import { RowScroller } from './RowScroller';
import styles from './Home.module.css';

/** Tarjetas de acceso rápido que se montan sobre el carrusel (como las del marketplace). */
export function ShortcutCards({ user }: { user: SelfUser | null }) {
  const cards = [
    user
      ? { icon: <UserIcon size={34} />, title: `Hola, ${user.displayName.split(' ')[0]}`, text: 'Revisa tu perfil, tu reputación y tus comisiones.', cta: 'Mi cuenta', href: '/perfil' }
      : { icon: <UserIcon size={34} />, title: 'Ingresa a tu cuenta', text: 'Guarda publicaciones, chatea y cierra tratos.', cta: 'Ingresar', href: '/entrar' },
    user?.neighborhood
      ? { icon: <PinIcon size={34} />, title: 'Tu colonia', text: `Mira lo que se ofrece en ${user.neighborhood}.`, cta: 'Ver cerca de ti', href: `/buscar?colonia=${encodeURIComponent(user.neighborhood)}` }
      : { icon: <PinIcon size={34} />, title: 'Tu colonia', text: 'Indica tu colonia para ver lo que hay cerca.', cta: 'Elegir colonia', href: user ? '/perfil' : '/registro' },
    { icon: <TagIcon />, title: 'Publica gratis', text: 'Pagas 5% solo cuando cierras un trato.', cta: 'Publicar', href: '/publicar' },
    { icon: <SwapIcon />, title: 'Sin comisión', text: 'El intercambio nunca paga comisión.', cta: 'Ver intercambios', href: '/buscar?tipo=intercambio' },
    { icon: <ShieldCheckIcon size={34} />, title: 'Vecinos verificados', text: 'Verifica tu INE y gana la insignia.', cta: 'Verificarme', href: user ? '/perfil/verificacion' : '/entrar?next=/perfil/verificacion' },
    { icon: <CartIcon size={34} />, title: 'Guardados', text: 'Tu carrito para negociar después.', cta: 'Ver guardados', href: '/guardados' },
  ];
  return (
    <section className={styles.shortcuts} aria-label="Accesos rápidos">
      <ul className={styles.shortcutList}>
        {cards.map((c) => (
          <li key={c.title} className={styles.shortcut}>
            <p className={styles.shortcutTitle}>{c.title}</p>
            <span className={styles.shortcutIcon} aria-hidden>
              {c.icon}
            </span>
            <p className={styles.shortcutText}>{c.text}</p>
            <Link href={c.href} className={styles.shortcutCta}>
              {c.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Caja con una fila horizontal de productos y "Ver todo". */
export function ProductRow({ title, href, cards }: { title: string; href: string; cards: ListingCardProps[] }) {
  if (cards.length === 0) return null;
  return (
    <section className={styles.box} aria-label={title}>
      <div className={styles.boxHead}>
        <h2 className={styles.boxTitle}>{title}</h2>
        <Link href={href} className={styles.boxLink}>
          Ver todo
        </Link>
      </div>
      <RowScroller label={title}>
        {cards.map((card) => (
          <li key={card.href} className={styles.rowItem}>
            <ListingCard {...card} />
          </li>
        ))}
      </RowScroller>
    </section>
  );
}

/** Caja de categorías: 4 columnas con la foto más reciente de cada categoría (o su ícono). */
export function CategoryGrid({ photos }: { photos: Partial<Record<string, string>> }) {
  const items = [
    ...LISTING_CATEGORIES.map((c) => ({ label: c, href: `/buscar?categoria=${encodeURIComponent(c)}`, photo: photos[c] })),
    { label: 'Servicios', href: '/buscar?tipo=servicios', photo: photos.Servicios },
  ];
  return (
    <section className={styles.box} aria-labelledby="categorias">
      <div className={styles.boxHead}>
        <h2 className={styles.boxTitle} id="categorias">
          Categorías
        </h2>
        <Link href="/buscar" className={styles.boxLink}>
          Ver todas las publicaciones
        </Link>
      </div>
      <ul className={styles.catGrid}>
        {items.map((it) => (
          <li key={it.label}>
            <Link href={it.href} className={styles.cat}>
              <span className={styles.catMedia}>
                {it.photo ? (
                  <Image src={it.photo} alt="" fill sizes="72px" className={styles.catImage} />
                ) : (
                  <span className={styles.catIcon} aria-hidden>
                    <TagIcon size={26} />
                  </span>
                )}
              </span>
              <span className={styles.catLabel}>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Franja de confianza en 3 columnas (como "Elige cómo pagar · Envío · Seguridad"). */
export function TrustStrip() {
  const items = [
    { icon: <ChatIcon size={40} />, title: 'Negocia directo', text: 'Chatea con cada vecino. Tu email y teléfono nunca se comparten.', cta: 'Ver mis tratos', href: '/mensajes' },
    { icon: <SwapIcon size={40} />, title: 'Comisiones justas', text: 'Intercambio sin comisión. En venta, renta y servicios, 5% solo al cerrar el trato.', cta: 'Publicar', href: '/publicar' },
    { icon: <ShieldCheckIcon size={40} />, title: 'Vecinos verificados', text: 'Verificación opcional con INE y comprobante de domicilio, revisada por el equipo.', cta: 'Cómo verificarme', href: '/perfil/verificacion' },
  ];
  return (
    <section className={styles.trust} aria-label="Por qué Bara Bara">
      {items.map((it) => (
        <div key={it.title} className={styles.trustItem}>
          <span className={styles.trustIcon} aria-hidden>
            {it.icon}
          </span>
          <h2 className={styles.trustTitle}>{it.title}</h2>
          <p className={styles.trustText}>{it.text}</p>
          <Link href={it.href} className={styles.trustLink}>
            {it.cta}
          </Link>
        </div>
      ))}
    </section>
  );
}
