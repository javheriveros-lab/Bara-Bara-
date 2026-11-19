import {
  isVerified,
  type ChatMessage,
  type ConversationDetail,
  type ConversationSummary,
  type Deal,
  type ListingItem,
  type ServiceItem,
} from '@bara/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import styles from '@/components/Chat/Chat.module.css';
import { ChatRoom } from '@/components/Chat/ChatRoom';
import type { DealContext } from '@/components/Chat/DealPanel';
import { ConversationList } from '@/components/Chat/ConversationList';
import { ReliableIcon, ShieldCheckIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { conversationItem, isItemOwner, otherParticipant } from '@/lib/chat';
import { getCurrentUser, getSessionToken } from '@/lib/session';
import { PUBLIC_API_ORIGIN } from '@/lib/env';

export const metadata: Metadata = { title: 'Mensajes · Bara Bara' };

const PAGE_SIZE = 50;
const API_ORIGIN = PUBLIC_API_ORIGIN;

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/mensajes/${id}`)}`);
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();

  const token = await getSessionToken();
  const [conversation, messages, inbox, deal] = await Promise.all([
    apiFetch<ConversationDetail>(`/conversations/${id}`, { token }), // también la marca como leída
    apiFetch<ChatMessage[]>(`/conversations/${id}/messages?take=${PAGE_SIZE}`, { token }),
    apiFetch<ConversationSummary[]>('/conversations', { token }),
    apiFetch<{ deal: Deal | null }>(`/conversations/${id}/deal`, { token }),
  ]);
  // 403 = no participas: se responde igual que si no existiera.
  if (!conversation.ok || !messages.ok) {
    if ([400, 403, 404].includes(conversation.status)) notFound();
    throw new Error('No pudimos cargar la conversación');
  }

  const c = conversation.data;
  const other = otherParticipant(c, user.id);
  const item = conversationItem(c);
  const suggestion = isItemOwner(c, user.id)
    ? undefined
    : c.service
      ? 'Hola, ¿tienes disponibilidad esta semana?'
      : 'Hola, ¿sigue disponible?';
  const dealContext = await loadDealContext(c, user.id);

  return (
    <main className={styles.shell}>
      <section className={`${styles.panel} ${styles.hideOnMobile}`} aria-label="Conversaciones">
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Mensajes</h2>
        </header>
        {inbox.ok && <ConversationList conversations={inbox.data} meId={user.id} activeId={c.id} />}
      </section>

      <section className={styles.panel} aria-label={`Conversación con ${other?.displayName ?? 'vecino'}`}>
        <header className={styles.roomHeader}>
          <Link href="/mensajes" className={styles.back} aria-label="Volver a mensajes">
            ←
          </Link>
          <span className={styles.avatar} aria-hidden>
            {other?.displayName.slice(0, 1).toUpperCase() ?? '?'}
          </span>
          <div className={styles.roomWho}>
            <h1 className={styles.roomName}>
              {other?.displayName ?? 'Vecino'}
              {other && isVerified(other) && (
                <span className={styles.verified} title="Vecino verificado">
                  <ShieldCheckIcon size={15} />
                </span>
              )}
              {other?.reliablePayer && (
                <span className={styles.reliable} title="Vecino Confiable: paga sus comisiones a tiempo">
                  <ReliableIcon size={15} />
                </span>
              )}
            </h1>
            {item ? (
              <Link href={item.href} className={styles.roomItem}>
                {item.kind} · {item.title}
              </Link>
            ) : (
              <span className={styles.roomItem}>Publicación retirada</span>
            )}
          </div>
        </header>

        <ChatRoom
          key={c.id}
          conversationId={c.id}
          meId={user.id}
          otherName={other?.displayName ?? 'tu vecino'}
          initialMessages={[...messages.data].reverse()}
          hasMore={messages.data.length === PAGE_SIZE}
          suggestion={suggestion}
          apiOrigin={API_ORIGIN}
          dealContext={dealContext}
          initialDeal={deal.ok ? deal.data.deal : null}
        />
      </section>
    </main>
  );
}

/** Quién propone y con qué precio de partida. null si la publicación se borró. */
async function loadDealContext(c: ConversationDetail, meId: string): Promise<DealContext | null> {
  const role = isItemOwner(c, meId) ? 'seller' : 'buyer';
  if (c.listing) {
    const res = await apiFetch<ListingItem>(`/listings/${c.listing.id}`);
    const l = res.ok ? res.data : null;
    return {
      role,
      kind: c.listing.type,
      suggestedAmount: (c.listing.type === 'RENT' ? l?.rentalRate : l?.price) ?? undefined,
      deposit: l?.deposit ?? null,
    };
  }
  if (c.service) {
    const res = await apiFetch<ServiceItem>(`/services/${c.service.id}`);
    return { role, kind: 'SERVICE', suggestedAmount: (res.ok && res.data.basePrice) || undefined };
  }
  return null;
}
