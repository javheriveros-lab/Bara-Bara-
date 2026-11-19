import { CARD_KIND_LABEL, type ConversationDetail, type PublicUser } from '@bara/shared';

/** El otro vecino de la conversación (hoy siempre son dos). */
export function otherParticipant(c: ConversationDetail, meId: string): PublicUser | undefined {
  return c.participants.find((p) => p.user.id !== meId)?.user;
}

/** De qué se está negociando: título, enlace y etiqueta del tipo. */
export function conversationItem(c: ConversationDetail): { title: string; href: string; kind: string } | null {
  if (c.listing) return { title: c.listing.title, href: `/p/${c.listing.id}`, kind: CARD_KIND_LABEL[c.listing.type] };
  if (c.service) return { title: c.service.title, href: `/s/${c.service.id}`, kind: CARD_KIND_LABEL.SERVICE };
  return null; // la publicación se borró
}

/** ¿Soy quien publicó? Decide la sugerencia del primer mensaje. */
export function isItemOwner(c: ConversationDetail, meId: string): boolean {
  return c.listing?.ownerId === meId || c.service?.providerId === meId;
}
