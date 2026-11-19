import { isVerified, type ConversationSummary } from '@bara/shared';
import Link from 'next/link';
import { ReliableIcon, ShieldCheckIcon } from '@/components/icons';
import { conversationItem, otherParticipant } from '@/lib/chat';
import { formatRelative } from '@/lib/format';
import styles from './Chat.module.css';

interface ConversationListProps {
  conversations: ConversationSummary[];
  meId: string;
  activeId?: string;
}

export function ConversationList({ conversations, meId, activeId }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className={styles.inboxEmpty}>
        <p>Aún no tienes conversaciones.</p>
        <Link href="/">Explora lo que ofrecen tus vecinos</Link>
      </div>
    );
  }

  return (
    <ul className={styles.inbox}>
      {conversations.map((c) => {
        const other = otherParticipant(c, meId);
        const item = conversationItem(c);
        const last = c.lastMessage;
        const active = c.id === activeId;
        const unread = c.unread && !active;

        return (
          <li key={c.id}>
            <Link
              href={`/mensajes/${c.id}`}
              className={styles.row}
              aria-current={active ? 'page' : undefined}
              data-unread={unread || undefined}
            >
              <span className={styles.avatar} aria-hidden>
                {other?.displayName.slice(0, 1).toUpperCase() ?? '?'}
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTop}>
                  <span className={styles.rowName}>
                    {other?.displayName ?? 'Vecino'}
                    {other && isVerified(other) && (
                      <span className={styles.verified} title="Vecino verificado">
                        <ShieldCheckIcon size={13} />
                      </span>
                    )}
                    {other?.reliablePayer && (
                      <span className={styles.reliable} title="Vecino Confiable">
                        <ReliableIcon size={13} />
                      </span>
                    )}
                  </span>
                  {last && <time className={styles.rowTime}>{formatRelative(last.createdAt)}</time>}
                </span>
                <span className={styles.rowItem}>{item ? `${item.kind} · ${item.title}` : 'Publicación retirada'}</span>
                <span className={styles.rowPreview}>
                  {last ? `${last.senderId === meId ? 'Tú: ' : ''}${last.body}` : 'Sin mensajes todavía'}
                </span>
              </span>
              {unread && <span className={styles.unreadDot} aria-label="Mensajes sin leer" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
