import type { DealKind } from '@prisma/client';

// Espejo de packages/shared/src/commission.ts (el backend compila a CommonJS y no importa el paquete TS).
// Mantener sincronizado: lo que la web muestra debe ser exactamente lo que aquí se registra.

export const COMMISSION_RATE = 0.05;
export const COMMISSION_DUE_DAYS = 7;
export const RELIABLE_PAYER_MIN_PAID = 3;
/** Ventana en la que un pago tardío impide la insignia "Vecino Confiable". */
export const RELIABLE_PAYER_LOOKBACK_DAYS = 90;
/** Vigencia de una referencia SPEI sin pagar. */
export const PAYMENT_REFERENCE_DAYS = 3;

export const commissionRateFor = (kind: DealKind) => (kind === 'BARTER' ? 0 : COMMISSION_RATE);

/** En centavos enteros para no arrastrar errores de punto flotante. */
export function splitAmount(kind: DealKind, amount: number) {
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

export const sumMoney = (values: number[]) => Math.round(values.reduce((s, v) => s + Math.round(v * 100), 0)) / 100;

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
