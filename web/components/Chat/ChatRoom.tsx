'use client';

import type { ChatMessage, Deal, DealUpdate } from '@bara/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketTokenAction, loadNewerMessagesAction, loadOlderMessagesAction } from '@/lib/chat-actions';
import styles from './Chat.module.css';
import { DealPanel, type DealContext } from './DealPanel';

const PAGE_SIZE = 50;
const SEND_TIMEOUT_MS = 10_000;
const MAX_LENGTH = 2000;

type Status = 'connecting' | 'online' | 'offline' | 'expired';
type UiMessage = ChatMessage & { state?: 'sending' | 'failed' };

interface ChatRoomProps {
  conversationId: string;
  meId: string;
  otherName: string;
  /** Más antiguos primero. */
  initialMessages: ChatMessage[];
  hasMore: boolean;
  /** Primer mensaje sugerido si la conversación está vacía. */
  suggestion?: string;
  /** Origen del backend (sin /api), p. ej. http://localhost:4000 */
  apiOrigin: string;
  /** null si la publicación ya no existe: no se pueden registrar tratos. */
  dealContext: DealContext | null;
  initialDeal: Deal | null;
}

const STATUS_LABEL: Record<Status, string> = {
  connecting: 'Conectando…',
  online: 'En línea',
  offline: 'Sin conexión, reintentando…',
  expired: 'Tu sesión expiró. Vuelve a entrar.',
};

export function ChatRoom({
  conversationId,
  meId,
  otherName,
  initialMessages,
  hasMore: initialHasMore,
  suggestion,
  apiOrigin,
  dealContext,
  initialDeal,
}: ChatRoomProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [status, setStatus] = useState<Status>('connecting');
  const [draft, setDraft] = useState(initialMessages.length === 0 ? (suggestion ?? '') : '');
  const [deal, setDeal] = useState(initialDeal);
  // Ignora respuestas viejas: por socket y por la Server Action llega el mismo trato.
  const applyDeal = useCallback((next: Deal) => {
    setDeal((cur) => {
      if (!cur) return next;
      if (cur.id === next.id) return rank(next) >= rank(cur) ? next : cur;
      return next.proposedAt >= cur.proposedAt ? next : cur;
    });
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepScrollFrom = useRef<number | null>(null);

  /** Agrega mensajes nuevos sin duplicar y en orden cronológico. */
  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((all) => {
      const known = new Set(all.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length ? [...all, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : all;
    });
  }, []);

  // ── Conexión ──
  useEffect(() => {
    let sessionMissing = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    // Refresca la bandeja/cabecera (SSR) como mucho una vez cada 2 s.
    const refreshSoon = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 2000);
    };

    const socket = io(`${apiOrigin}/chat`, {
      // Manager propio: socket.io-client comparte uno por URL, y al desmontar (o con el doble
      // montaje de StrictMode) limpiar sus listeners rompería el socket del siguiente montaje.
      forceNew: true,
      // WebSocket primero; si una red lo bloquea (algunas redes corporativas o móviles), long-polling.
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnectionDelayMax: 10_000,
      // Se llama en cada (re)conexión: token nuevo de 2 minutos vía Server Action.
      auth: (cb) => {
        getSocketTokenAction()
          .then((token) => {
            sessionMissing = !token;
            cb({ token: token ?? '' });
          })
          .catch(() => cb({ token: '' }));
      },
    });
    socketRef.current = socket;

    const markRead = () => socket.emit('conversation:read', { conversationId });

    // Lo que llegó mientras no había socket (señal intermitente, reconexión, pestaña dormida).
    const catchUp = () => {
      const lastConfirmed = messagesRef.current.filter((m) => !m.state).at(-1);
      void loadNewerMessagesAction(conversationId, lastConfirmed?.createdAt ?? new Date(0).toISOString()).then(
        (newer) => newer && merge(newer),
      );
    };

    let firstConnect = true;
    socket.on('connect', () => {
      setStatus('online');
      markRead();
      catchUp();
      // El header se renderiza en paralelo a la página y puede haber contado esta
      // conversación como no leída: al entrar se refresca de inmediato.
      if (firstConnect) router.refresh();
      else refreshSoon();
      firstConnect = false;
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting'));
    // Si el servidor rechaza el handshake, socket.io no reintenta solo.
    socket.on('connect_error', () => {
      if (sessionMissing) return setStatus('expired');
      setStatus('offline');
      if (!socket.active) retry = setTimeout(() => socket.connect(), 3000);
    });

    socket.on('message:new', (m: ChatMessage) => {
      if (m.conversationId !== conversationId) return refreshSoon(); // llegó a otra conversación
      merge([m]);
      if (m.senderId !== meId) {
        markRead();
        refreshSoon();
      }
    });

    socket.on('deal:update', (e: DealUpdate) => {
      if (e.conversationId === conversationId) applyDeal(e.deal);
    });

    return () => {
      clearTimeout(retry);
      clearTimeout(refreshTimer);
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiOrigin, conversationId, meId, router, merge, applyDeal]);

  // ── Scroll ──
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (keepScrollFrom.current !== null) {
      // Tras cargar anteriores: conserva lo que el vecino estaba viendo.
      el.scrollTop = el.scrollHeight - keepScrollFrom.current;
      keepScrollFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // ── Enviar ──
  const deliver = useCallback(
    async (tempId: string, body: string) => {
      const socket = socketRef.current;
      const fail = () => setMessages((all) => all.map((m) => (m.id === tempId ? { ...m, state: 'failed' } : m)));
      // Sin conexión no se encola: evita mensajes duplicados al reintentar.
      if (!socket?.connected) return fail();
      try {
        const saved: ChatMessage = await socket.timeout(SEND_TIMEOUT_MS).emitWithAck('message:send', { conversationId, body });
        setMessages((all) => {
          const rest = all.filter((m) => m.id !== saved.id); // pudo llegar antes por message:new
          return rest.map((m) => (m.id === tempId ? saved : m));
        });
      } catch {
        fail();
      }
    },
    [conversationId],
  );

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const tempId = `tmp-${crypto.randomUUID()}`;
    stickToBottom.current = true;
    setMessages((all) => [
      ...all,
      { id: tempId, conversationId, senderId: meId, body, kind: 'TEXT', dealId: null, createdAt: new Date().toISOString(), state: 'sending' },
    ]);
    setDraft('');
    void deliver(tempId, body);
  };

  const retrySend = (m: UiMessage) => {
    setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, state: 'sending' } : x)));
    void deliver(m.id, m.body);
  };

  const loadOlder = async () => {
    const oldest = messages.find((m) => !m.state);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const older = await loadOlderMessagesAction(conversationId, oldest.createdAt);
    setLoadingOlder(false);
    if (!older) return;
    keepScrollFrom.current = (listRef.current?.scrollHeight ?? 0) - (listRef.current?.scrollTop ?? 0);
    setHasMore(older.length === PAGE_SIZE);
    setMessages((all) => [...older.reverse().filter((o) => !all.some((m) => m.id === o.id)), ...all]);
  };

  return (
    <div className={styles.room}>
      <p className={styles.status} data-status={status} role="status">
        <span aria-hidden />
        {STATUS_LABEL[status]}
      </p>

      {dealContext && (
        <DealPanel {...dealContext} conversationId={conversationId} otherName={otherName} deal={deal} onDeal={applyDeal} />
      )}

      <div ref={listRef} className={styles.messages} onScroll={onScroll} aria-live="polite" aria-label={`Conversación con ${otherName}`}>
        {hasMore && (
          <button type="button" className={styles.older} onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}
          </button>
        )}

        <p className={styles.privacy}>
          Tu email y teléfono nunca se comparten. Acuerden un punto de encuentro seguro y revisen el objeto antes de pagar.
        </p>

        {messages.map((m, i) => {
          const mine = m.senderId === meId;
          const newDay = i === 0 || dayKey(messages[i - 1].createdAt) !== dayKey(m.createdAt);
          return (
            <div key={m.id} className={styles.messageGroup}>
              {/* Hora y día dependen de la zona del navegador; el servidor puede estar en otra. */}
              {newDay && (
                <p className={styles.day} suppressHydrationWarning>
                  {dayLabel(m.createdAt)}
                </p>
              )}
              {m.kind === 'DEAL' ? (
                <p className={styles.notice}>
                  <strong>{mine ? 'Tú' : otherName}:</strong> {m.body}
                  <span className={styles.meta} suppressHydrationWarning>
                    {' '}
                    · {timeLabel(m.createdAt)}
                  </span>
                </p>
              ) : (
              <div className={mine ? styles.mine : styles.theirs} data-state={m.state}>
                <p className={styles.body}>{m.body}</p>
                <span className={styles.meta} suppressHydrationWarning>
                  {m.state === 'sending' && 'Enviando…'}
                  {m.state === 'failed' && (
                    <>
                      No se envió ·{' '}
                      <button type="button" className={styles.retry} onClick={() => retrySend(m)}>
                        Reintentar
                      </button>
                    </>
                  )}
                  {!m.state && timeLabel(m.createdAt)}
                </span>
              </div>
              )}
            </div>
          );
        })}
      </div>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="chat-draft" className={styles.srOnly}>
          Escribe un mensaje para {otherName}
        </label>
        <textarea
          id="chat-draft"
          className={styles.draft}
          value={draft}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder="Escribe un mensaje…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía; Shift+Enter hace salto de línea; no interrumpe teclados con composición (IME).
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="submit" className={styles.send} disabled={!draft.trim() || status === 'expired'}>
          Enviar
        </button>
      </form>
    </div>
  );
}

/** Orden de estados de un mismo trato: una respuesta atrasada no puede revertir uno más nuevo. */
const rank = (d: Deal) => (d.status === 'PROPOSED' ? 0 : 1);

const dayKey = (iso: string) => new Date(iso).toDateString();
const timeFmt = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const timeLabel = (iso: string) => timeFmt.format(new Date(iso));

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return dayFmt.format(d);
}
