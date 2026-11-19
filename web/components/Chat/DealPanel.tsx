'use client';

import { COMMISSION_RATE, formatRate, splitAmount, type CardKind, type Deal } from '@bara/shared';
import { AnimatePresence, m } from 'framer-motion';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { cancelDealAction, confirmDealAction, proposeDealAction, type DealActionResult } from '@/lib/deal-actions';
import { formatMoney } from '@/lib/format';
import { SPRING_SNAP } from '@/components/Motion/MotionProvider';
import styles from './Chat.module.css';

export interface DealContext {
  /** seller: publicó (propone). buyer: compra, renta o contrata (confirma). */
  role: 'seller' | 'buyer';
  kind: CardKind;
  /** Precio publicado, para prellenar la propuesta. */
  suggestedAmount?: number;
  /** Renta: fianza publicada (informativa, no paga comisión). */
  deposit?: number | null;
}

interface DealPanelProps extends DealContext {
  conversationId: string;
  otherName: string;
  deal: Deal | null;
  onDeal: (deal: Deal) => void;
}

const dueFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/**
 * Registro del trato en la negociación. El vendedor propone el precio final; el comprador confirma.
 * La comisión de Bara Bara (5%, intercambio 0%) se descuenta al vendedor: el comprador paga lo acordado.
 */
export function DealPanel(props: DealPanelProps) {
  // Cada estado del trato entra y el anterior sale con una transición corta.
  // AnimatePresence necesita la hoja con su key como hijo directo para animar también la salida.
  const sheet = useDealSheet(props);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {sheet}
    </AnimatePresence>
  );
}

/** Hoja del panel: entra con un deslizamiento corto y preciso; la anterior se desvanece. */
function Sheet({ children, ...rest }: React.ComponentProps<typeof m.section>) {
  return (
    <m.section
      className={styles.deal}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, transition: SPRING_SNAP }}
      exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
      {...rest}
    >
      {children}
    </m.section>
  );
}

/** Estado del panel y la hoja que toca mostrar (null si no hay nada que hacer). */
function useDealSheet({ conversationId, otherName, role, kind, suggestedAmount, deposit, deal, onDeal }: DealPanelProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : '');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const barter = kind === 'BARTER';

  const run = (action: () => Promise<DealActionResult>) =>
    startTransition(async () => {
      setError(undefined);
      const res = await action();
      if (res.ok) {
        onDeal(res.deal);
        setOpen(false);
      } else setError(res.message);
    });

  const propose = () => {
    if (barter) return run(() => proposeDealAction(conversationId));
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value < 1) return setError('Escribe el precio que acordaron');
    run(() => proposeDealAction(conversationId, value));
  };

  const errorNote = error && (
    <p className={styles.dealError} role="alert">
      {error}
    </p>
  );

  // ── Propuesta esperando respuesta ──
  if (deal?.status === 'PROPOSED') {
    const what = barter ? 'cerrar el intercambio' : `cerrar en ${formatMoney(deal.amount)}`;
    return (
      <Sheet key="proposed" aria-label="Trato">
        {role === 'buyer' ? (
          <>
            <p className={styles.dealText}>
              <strong>{otherName}</strong> propone {what}
              {deal.rentalDeposit ? ` + fianza de ${formatMoney(deal.rentalDeposit)} (se devuelve)` : ''}.
            </p>
            <div className={styles.dealActions}>
              <button type="button" className={styles.dealCritical} disabled={pending} onClick={() => run(() => confirmDealAction(deal.id))}>
                {pending ? 'Confirmando…' : 'Confirmar trato'}
              </button>
              <button type="button" className={styles.dealGhost} disabled={pending} onClick={() => run(() => cancelDealAction(deal.id))}>
                Rechazar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.dealText}>
              Propusiste {what}. Esperando a que <strong>{otherName}</strong> confirme.
            </p>
            <div className={styles.dealActions}>
              <button type="button" className={styles.dealGhost} disabled={pending} onClick={() => run(() => cancelDealAction(deal.id))}>
                Retirar propuesta
              </button>
            </div>
          </>
        )}
        {errorNote}
      </Sheet>
    );
  }

  // ── Formulario del vendedor ──
  if (role === 'seller' && open) {
    const value = Number(amount.replace(',', '.'));
    const split = Number.isFinite(value) && value > 0 ? splitAmount(kind, value) : null;
    return (
      <Sheet key="form" aria-label="Cerrar trato">
        <form
          className={styles.dealForm}
          onSubmit={(e) => {
            e.preventDefault();
            propose();
          }}
        >
          {barter ? (
            <p className={styles.dealText}>
              Registra el intercambio con <strong>{otherName}</strong>. <span className={styles.free}>Sin comisión.</span>
            </p>
          ) : (
            <label className={styles.dealField}>
              <span>{kind === 'RENT' ? 'Tarifa acordada' : 'Precio acordado'}</span>
              <span className={styles.dealInputWrap}>
                <span aria-hidden>$</span>
                <input
                  className={styles.dealInput}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  aria-describedby="deal-breakdown"
                />
              </span>
            </label>
          )}
          {!barter && (
            <p id="deal-breakdown" className={styles.dealBreakdown}>
              {split ? (
                <>
                  Recibes <strong>{formatMoney(split.net)}</strong> · Comisión Bara Bara {formatRate(split.rate)}:{' '}
                  {formatMoney(split.commission)}
                </>
              ) : (
                `Bara Bara cobra ${formatRate(COMMISSION_RATE)} al cerrar; ${otherName} paga lo acordado.`
              )}
              {kind === 'RENT' && deposit ? ` La fianza de ${formatMoney(deposit)} no paga comisión.` : ''}
            </p>
          )}
          <div className={styles.dealActions}>
            <button type="submit" className={styles.dealPrimary} disabled={pending}>
              {pending ? 'Enviando…' : 'Proponer'}
            </button>
            <button type="button" className={styles.dealGhost} disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
        {errorNote}
      </Sheet>
    );
  }

  // ── Trato cerrado ──
  if (deal?.status === 'CONFIRMED') {
    const repeatable = kind === 'RENT' || kind === 'SERVICE';
    return (
      <Sheet key="closed" aria-label="Trato">
        <p className={styles.dealText}>
          <span className={styles.dealDone}>Trato cerrado ✓</span>
          {barter ? ' Intercambio sin comisión.' : ` ${formatMoney(deal.amount)}`}
          {role === 'seller' && deal.commission > 0 && (
            <>
              {' '}· Comisión {formatMoney(deal.commission)}
              {deal.dueAt && <span suppressHydrationWarning>, vence el {dueFmt.format(new Date(deal.dueAt))}</span>} ·{' '}
              <Link href="/perfil/comisiones" className={styles.dealLink}>
                Pagar
              </Link>
            </>
          )}
        </p>
        {role === 'seller' && repeatable && (
          <div className={styles.dealActions}>
            <button type="button" className={styles.dealGhost} onClick={() => setOpen(true)}>
              Registrar otro trato
            </button>
          </div>
        )}
      </Sheet>
    );
  }

  // ── Sin trato (o el último se canceló) ──
  if (role === 'seller') {
    return (
      <Sheet key="idle" aria-label="Trato">
        <p className={styles.dealText}>¿Ya se pusieron de acuerdo? Registra el trato para que {otherName} lo confirme.</p>
        <div className={styles.dealActions}>
          <button type="button" className={styles.dealPrimary} onClick={() => setOpen(true)}>
            Cerrar trato
          </button>
        </div>
      </Sheet>
    );
  }
  return null;
}
