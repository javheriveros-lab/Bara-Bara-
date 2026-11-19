import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import styles from '../perfil.module.css';
import { PasswordForm, ProfileForm } from './ProfileForms';

export const metadata: Metadata = { title: 'Editar perfil · Bara Bara' };

export default async function EditarPerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/perfil/editar');

  return (
    <main className={styles.main}>
      <Link href="/perfil" className={styles.back}>
        ← Mi perfil
      </Link>
      <section className={styles.card} aria-labelledby="perfil-datos">
        <h1 id="perfil-datos" className={styles.sectionTitle}>
          Tus datos
        </h1>
        <ProfileForm displayName={user.displayName} neighborhood={user.neighborhood ?? ''} />
      </section>
      <section className={`${styles.card} ${styles.cardGap}`} aria-labelledby="perfil-pass">
        <h2 id="perfil-pass" className={styles.sectionTitle}>
          Contraseña
        </h2>
        <PasswordForm />
      </section>
    </main>
  );
}
