import type { ConversationSummary } from '@bara/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from '@/components/Chat/Chat.module.css';
import { ConversationList } from '@/components/Chat/ConversationList';
import { apiFetch } from '@/lib/api';
import { getCurrentUser, getSessionToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Mensajes · Bara Bara' };

export default async function MensajesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/mensajes');

  const inbox = await apiFetch<ConversationSummary[]>('/conversations', { token: await getSessionToken() });

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-label="Conversaciones">
        <header className={styles.panelHeader}>
          <h1 className={styles.panelTitle}>Mensajes</h1>
        </header>
        {inbox.ok ? (
          <ConversationList conversations={inbox.data} meId={user.id} />
        ) : (
          <p className={styles.placeholder} role="alert">
            No pudimos cargar tus conversaciones. Intenta de nuevo.
          </p>
        )}
      </section>

      <section className={`${styles.panel} ${styles.hideOnMobile}`} aria-hidden>
        <p className={styles.placeholder}>Elige una conversación para seguir negociando.</p>
      </section>
    </main>
  );
}
