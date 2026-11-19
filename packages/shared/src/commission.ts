// Modelo de negocio: Bara Bara cobra 5% al vendedor/prestador en Venta, Renta y Chamba.
// El Trueque es gratis. En Renta se cobra sobre la tarifa acordada, nunca sobre la fianza.
// Misma fuente para backend (lo que se registra) y web/mobile (lo que se muestra).
import type { CardKind } from './types';

export const COMMISSION_RATE = 0.05;

/** Días para pagar la comisión desde que el comprador confirma el trato. Después, bloqueo. */
export const COMMISSION_DUE_DAYS = 7;

/** Pagos confirmados necesarios (sin atrasos) para la insignia "Vecino Confiable". */
export const RELIABLE_PAYER_MIN_PAID = 3;

export const commissionRateFor = (kind: CardKind): number => (kind === 'BARTER' ? 0 : COMMISSION_RATE);

export interface AmountSplit {
  /** Lo que paga el comprador (precio acordado; en Renta, solo la tarifa). */
  amount: number;
  /** Lo que el vendedor le debe a Bara Bara. */
  commission: number;
  /** Lo que se queda el vendedor. */
  net: number;
  rate: number;
}

/** Se calcula en centavos enteros para no arrastrar errores de punto flotante. */
export function splitAmount(kind: CardKind, amount: number): AmountSplit {
  const rate = commissionRateFor(kind);
  const amountCents = Math.round(amount * 100);
  const commissionCents = Math.round(amountCents * rate);
  return {
    amount: amountCents / 100,
    commission: commissionCents / 100,
    net: (amountCents - commissionCents) / 100,
    rate,
  };
}

/** "5%" / "0%". */
export const formatRate = (rate: number) => `${Math.round(rate * 1000) / 10}%`;
