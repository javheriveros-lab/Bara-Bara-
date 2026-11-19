// Espejo de los enums de backend/prisma/schema.prisma para web y mobile.
// Mantener sincronizado al modificar el esquema.

export type ListingType = 'SALE' | 'RENT' | 'BARTER';
export type ListingStatus = 'ACTIVE' | 'RESERVED' | 'PAUSED' | 'CLOSED';
export type ItemCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
export type RentalPeriod = 'HOUR' | 'DAY' | 'WEEK';

export type ServiceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'BEAUTY'
  | 'COOKING'
  | 'CLASSES'
  | 'OTHER';
export type PricingModel = 'FIXED' | 'HOURLY' | 'QUOTE';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VerificationDocType = 'INE' | 'INE_BACK' | 'PROOF_OF_ADDRESS';

export type DealStatus = 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
/** NONE: trueque (0%). PENDING: se debe. PAID: conciliada. */
export type CommissionStatus = 'NONE' | 'PENDING' | 'PAID';
export type CommissionPaymentStatus = 'PENDING' | 'PROOF_SUBMITTED' | 'PAID' | 'REJECTED' | 'CANCELLED';

/** Tipo que muestra una tarjeta: publicaciones (Listing) + servicios de la comunidad (Service). */
export type CardKind = ListingType | 'SERVICE';

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  SALE: 'Venta',
  RENT: 'Renta',
  BARTER: 'Intercambio',
  SERVICE: 'Servicio',
};

/** Perfil público de un vecino (`publicUserSelect` del backend): nunca incluye email, teléfono ni documentos. */
export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  neighborhood: string | null;
  verificationStatus: VerificationStatus;
  reputationScore: number;
  reviewCount: number;
  /** Insignia "Vecino Confiable": paga sus comisiones a tiempo. null en cuentas anteriores = no. */
  reliablePayer: boolean | null;
}

/** Perfil propio (`GET /users/me`). */
export interface SelfUser extends PublicUser {
  email: string;
  phone: string | null;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  ineVerified: boolean;
  addressProofVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export const isVerified = (u: Pick<PublicUser, 'verificationStatus'>) => u.verificationStatus === 'VERIFIED';

/** `POST /auth/register` y `POST /auth/login`. */
export interface AuthResponse {
  accessToken: string;
  user: SelfUser;
}

/** Cuerpo de error de la API. `fields` viene en los 400 de validación. */
export interface ApiErrorBody {
  statusCode: number;
  error?: string;
  message: string | string[];
  fields?: Record<string, string>;
  /** 'PROHIBITED_CONTENT': la moderación rechazó el texto (ver moderation.ts). */
  code?: string;
}

// ───────────── Publicaciones y servicios (respuestas de la API) ─────────────

interface ItemBase {
  id: string;
  title: string;
  description: string;
  neighborhood: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

/** `GET /listings`, `GET /listings/:id`. */
export interface ListingItem extends ItemBase {
  type: ListingType;
  status: ListingStatus;
  category: string;
  condition: ItemCondition;
  price: number | null;
  rentalRate: number | null;
  rentalPeriod: RentalPeriod | null;
  deposit: number | null;
  barterWants: string[];
  acceptsServices: boolean;
  ownerId: string;
  owner: PublicUser;
}

/** `GET /services`, `GET /services/:id`. */
export interface ServiceItem extends ItemBase {
  category: ServiceCategory;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  pricingModel: PricingModel;
  basePrice: number | null;
  coverageRadiusKm: number;
  availability: Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string[]>> | null;
  providerId: string;
  provider: PublicUser;
}

/** `POST /uploads/signature`: firma para subir directo a ImageKit desde el navegador. */
export interface UploadSignature {
  /** https://upload.imagekit.io/api/v1/files/upload */
  uploadUrl: string;
  publicKey: string;
  token: string;
  expire: number;
  signature: string;
  /** folder, useUniqueFileName, isPrivateFile…: se envían tal cual junto con file y fileName. */
  params: Record<string, string>;
}

// ───────────── Etiquetas en español ─────────────

/** Categorías sugeridas para objetos (el backend acepta texto libre de 2–40 caracteres). */
export const LISTING_CATEGORIES = [
  'Herramientas',
  'Tecnología',
  'Eventos',
  'Hogar',
  'Muebles',
  'Ropa',
  'Movilidad',
  'Libros y música',
  'Niñez',
  'Deportes',
  'Otros',
] as const;

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  PLUMBING: 'Plomería',
  ELECTRICAL: 'Electricidad',
  BEAUTY: 'Belleza',
  COOKING: 'Cocina',
  CLASSES: 'Clases',
  OTHER: 'Otro',
};

export const RENTAL_PERIOD_LABEL: Record<RentalPeriod, { label: string; suffix: string }> = {
  HOUR: { label: 'Por hora', suffix: '/hora' },
  DAY: { label: 'Por día', suffix: '/día' },
  WEEK: { label: 'Por semana', suffix: '/semana' },
};

export const CONDITION_LABEL: Record<ItemCondition, string> = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Como nuevo',
  GOOD: 'Buen estado',
  FAIR: 'Con detalles',
};

export const PRICING_MODEL_LABEL: Record<PricingModel, { label: string; hint: string }> = {
  FIXED: { label: 'Precio fijo', hint: 'Un precio por el trabajo completo.' },
  HOURLY: { label: 'Por hora', hint: 'Cobras una tarifa por hora.' },
  QUOTE: { label: 'A cotizar', hint: 'Das el precio por chat al conocer el trabajo.' },
};

// ───────────── Chat de negociación ─────────────

/** Mensaje tal como lo emite el socket (`message:new`) y la API. Solo userIds, nunca datos de contacto. */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  /** 'DEAL': aviso del sistema sobre el trato (se muestra como tarjeta). null = texto. */
  kind: 'TEXT' | 'DEAL' | null;
  dealId: string | null;
}

export interface ChatParticipant {
  lastReadAt: string | null;
  user: PublicUser;
}

/** `GET /conversations/:id`. */
export interface ConversationDetail {
  id: string;
  listingId: string | null;
  serviceId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  listing: { id: string; title: string; type: ListingType; ownerId: string } | null;
  service: { id: string; title: string; category: ServiceCategory; providerId: string } | null;
}

/** `GET /conversations` (bandeja). */
export interface ConversationSummary extends ConversationDetail {
  lastMessage: ChatMessage | null;
  unread: boolean;
}

// ───────────── Tratos y comisiones ─────────────

/** Trato registrado en una conversación. El vendedor propone, el comprador confirma. */
export interface Deal {
  id: string;
  conversationId: string;
  listingId: string | null;
  serviceId: string | null;
  sellerId: string;
  buyerId: string;
  kind: CardKind;
  /** Precio acordado (en Renta, solo la tarifa). */
  amount: number;
  /** Informativo: la fianza nunca paga comisión. */
  rentalDeposit: number | null;
  commissionRate: number;
  commission: number;
  status: DealStatus;
  commissionStatus: CommissionStatus;
  proposedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
}

/** Evento de socket `deal:update`. */
export interface DealUpdate {
  conversationId: string;
  deal: Deal;
}

export interface CommissionPayment {
  id: string;
  /** Referencia SPEI única (BB-7K2M9QXA): va en el concepto de la transferencia. */
  reference: string;
  amount: number;
  status: CommissionPaymentStatus;
  dealIds: string[];
  hasProof: boolean;
  reviewerNote: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
}

/** Trato con comisión, tal como aparece en el historial del vendedor. */
export interface CommissionDeal extends Deal {
  itemTitle: string;
  buyerName: string;
  overdue: boolean;
}

/** `GET /commissions`: estado de cuenta del vecino con Bara Bara. */
export interface CommissionSummary {
  pendingTotal: number;
  overdueTotal: number;
  nextDueAt: string | null;
  /** Publicaciones pausadas por comisiones vencidas. */
  onHold: boolean;
  reliablePayer: boolean;
  deals: CommissionDeal[];
  activePayment: CommissionPayment | null;
  payments: CommissionPayment[];
  /** null si el pago por SPEI aún no está configurado. */
  bank: BankInfo | null;
}

export interface BankInfo {
  clabe: string;
  beneficiary: string;
  bankName: string | null;
}

/** `POST /commissions/payments`: datos para transferir por SPEI. */
export interface PaymentInstructions {
  payment: CommissionPayment;
  bank: BankInfo;
}

// ───────────── Verificación de identidad ─────────────

/** Archivo privado subido a ImageKit: la API lo comprueba por su `fileId`. */
export interface PrivateUpload {
  fileId: string;
  /** Nombre original, solo para mostrarlo en el formulario. */
  fileName: string;
}

/** `GET /verification/me`: nunca devuelve los archivos. */
export interface VerificationState {
  status: VerificationStatus;
  reviewerNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}
