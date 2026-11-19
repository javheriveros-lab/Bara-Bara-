import Link from 'next/link';
import { Suspense } from 'react';
import { CategoriesMenu } from '@/components/CategoriesMenu/CategoriesMenu';
import { PillarLinks, PillarNav } from '@/components/PillarNav/PillarNav';
import { SearchBar, SearchForm } from '@/components/SearchBar/SearchBar';
import { apiFetch } from '@/lib/api';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import { CartIcon, ChatIcon, PinIcon, UserIcon } from '../icons';
import styles from './SiteHeader.module.css';

/**
 * Header de tienda con la distribución de un gran marketplace:
 * fila 1: logo · buscador ancho · "Publica gratis";
 * fila 2: colonia · Categorías ▾ y pilares · cuenta, Mis tratos y Guardados (carrito).
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const token = user ? await getSessionToken() : undefined;
  const [unread, savedCount] = user ? await Promise.all([unreadCount(token), savedTotal(token)]) : [0, 0];

  return (
    <div className={styles.bar}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Bara Bara, inicio">
          {/* Logo oficial en blanco con la base de la esfera en rojo (web/public/brand). Estático, sin loader de ImageKit. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-horizontal-white.webp" alt="¡Bara Bara!" width={172} height={44} fetchPriority="high" />
        </Link>

        <div className={styles.search}>
          <Suspense fallback={<SearchForm />}>
            <SearchBar />
          </Suspense>
        </div>

        <Link href="/publicar" className={styles.cta}>
          <span className={styles.ctaLong}>Publica gratis</span>
          <span className={styles.ctaShort}>Publicar</span>
        </Link>

        <Link href={user ? '/perfil' : '/entrar?next=/perfil'} className={styles.location}>
          <PinIcon />
          <span className={styles.locationText}>
            <span className={styles.locationLabel}>Tu colonia</span>
            <span className={styles.locationValue}>{user?.neighborhood ?? 'Elige tu colonia'}</span>
          </span>
        </Link>

        <div className={styles.nav}>
          <CategoriesMenu />
          {/* La sección activa sale de la URL (useSearchParams): mientras tanto, sin marcar. */}
          <Suspense fallback={<PillarLinks />}>
            <PillarNav />
          </Suspense>
        </div>

        <nav className={styles.account} aria-label="Cuenta">
          {user ? (
            <Link href="/perfil" className={styles.textLink} aria-label={`Mi cuenta (${user.displayName})`}>
              <UserIcon size={20} />
              <span className={styles.wideOnly}>{user.displayName.split(' ')[0]}</span>
            </Link>
          ) : (
            <>
              <Link href="/registro" className={`${styles.textLink} ${styles.wideOnly}`}>
                Crea tu cuenta
              </Link>
              <Link href="/entrar" className={`${styles.textLink} ${styles.wideOnly}`}>
                Ingresa
              </Link>
              <Link href="/entrar" className={`${styles.iconLink} ${styles.narrowOnly}`} aria-label="Ingresa o crea tu cuenta">
                <UserIcon />
              </Link>
            </>
          )}
          {user && (
            <Link href="/mensajes" className={styles.textLink} aria-label={unread ? `Mis tratos, ${unread} sin leer` : 'Mis tratos'}>
              <ChatIcon size={20} />
              <span className={styles.wideOnly}>Mis tratos</span>
              {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
            </Link>
          )}
          <Link href="/guardados" className={styles.iconLink} aria-label={savedCount ? `Guardados, ${savedCount}` : 'Guardados'}>
            <CartIcon />
            {savedCount > 0 && <span className={styles.badge}>{savedCount > 99 ? '99+' : savedCount}</span>}
          </Link>
        </nav>
      </header>
    </div>
  );
}

async function unreadCount(token?: string): Promise<number> {
  const res = await apiFetch<{ count: number }>('/conversations/unread-count', { token });
  return res.ok ? res.data.count : 0;
}

async function savedTotal(token?: string): Promise<number> {
  const res = await apiFetch<string[]>('/saved/keys', { token });
  return res.ok ? res.data.length : 0;
}
