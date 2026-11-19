'use client';

import {
  COMMISSION_RATE,
  CONDITION_LABEL,
  formatRate,
  LISTING_CATEGORIES,
  PRICING_MODEL_LABEL,
  RENTAL_PERIOD_LABEL,
  SERVICE_CATEGORY_LABEL,
  splitAmount,
  type CardKind,
  type PricingModel,
} from '@bara/shared';
import { useActionState, useCallback, useEffect, useState } from 'react';
import { LoadingOverlay } from '@/components/Loading/LoadingOverlay';
import { Field, FormError, SelectField, SubmitButton, TextareaField } from '@/components/form/Field';
import type { FormState } from '@/lib/form-state';
import { formatMoney } from '@/lib/format';
import { moderationState } from '@/lib/moderation';
import { createListingAction, createServiceAction, updateListingAction, updateServiceAction } from '@/lib/publish-actions';
import { ImagePicker } from './ImagePicker';
import styles from './PublishForm.module.css';

interface PublishFormProps {
  kind: CardKind;
  defaultNeighborhood?: string;
  uploadsEnabled: boolean;
  /** Al editar: id de la publicación, sus valores actuales y sus fotos. */
  editId?: string;
  initial?: Record<string, string>;
  initialImages?: string[];
}

const options = <K extends string>(labels: Record<K, string>) =>
  (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));

const choose = (label: string) => [{ value: '', label }];

const TITLE_PLACEHOLDER: Record<CardKind, string> = {
  SALE: 'Ej. Bicicleta rodada 26',
  RENT: 'Ej. Taladro con brocas',
  BARTER: 'Ej. Colección de vinilos',
  SERVICE: 'Ej. Plomería y reparación de fugas',
};

export function PublishForm({ kind, defaultNeighborhood, uploadsEnabled, editId, initial, initialImages }: PublishFormProps) {
  const isService = kind === 'SERVICE';
  const editing = Boolean(editId);
  const action = editing
    ? isService
      ? updateServiceAction
      : updateListingAction
    : isService
      ? createServiceAction
      : createListingAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [uploading, setUploading] = useState(false);
  const onBusyChange = useCallback((busy: boolean) => setUploading(busy), []);

  // Aviso de moderación antes de enviar (la Server Action y la API vuelven a revisar).
  const [blocked, setBlocked] = useState<FormState | null>(null);
  useEffect(() => setBlocked(null), [state]);

  const v = state.values ?? initial ?? {};
  const err = blocked?.fields ?? state.fields ?? {};
  const defaultPricing = (v.pricingModel as PricingModel) || 'FIXED';
  // Solo decide qué campo de precio mostrar. El <select> no es controlado: React 19 restablece
  // el formulario tras la acción y un select controlado quedaría desincronizado.
  const [pricing, setPricing] = useState<PricingModel>(defaultPricing);
  useEffect(() => setPricing(defaultPricing), [defaultPricing]);
  // Monto que escribe el vecino, para mostrar en vivo cuánto recibe y cuánto es la comisión.
  const initialAmount = v.price ?? v.rentalRate ?? v.basePrice ?? '';
  const [amount, setAmount] = useState(initialAmount);
  useEffect(() => setAmount(initialAmount), [initialAmount]);

  return (
    <form
      action={formAction}
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        const values = Object.fromEntries(
          [...new FormData(e.currentTarget).entries()].map(([k, val]) => [k, typeof val === 'string' ? val : '']),
        );
        const result = moderationState(values);
        setBlocked(result);
        if (result) {
          e.preventDefault(); // no se envía: nada llega a la API ni a la base
          e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }}
      onInput={(e) => {
        const input = e.target as HTMLInputElement;
        if (AMOUNT_FIELDS.includes(input.name)) setAmount(input.value);
      }}
    >
      {!isService && <input type="hidden" name="type" value={kind} />}
      {editId && <input type="hidden" name="id" value={editId} />}
      <FormError message={blocked?.message ?? state.message} />

      {/* Se vuelve a montar tras cada intento fallido para mostrar lo que el vecino escribió. */}
      <div key={JSON.stringify(v)} className={styles.fields}>
        <Field
          name="title"
          label={isService ? '¿Qué servicio ofreces?' : '¿Qué ofreces?'}
          placeholder={TITLE_PLACEHOLDER[kind]}
          defaultValue={v.title}
          error={err.title}
          maxLength={80}
        />

        {isService ? (
          <SelectField
            name="category"
            label="Oficio"
            options={[...choose('Elige un oficio'), ...options(SERVICE_CATEGORY_LABEL)]}
            defaultValue={v.category ?? ''}
            error={err.category}
          />
        ) : (
          <div className={styles.row}>
            <SelectField
              name="category"
              label="Categoría"
              options={[...choose('Elige una categoría'), ...LISTING_CATEGORIES.map((c) => ({ value: c, label: c }))]}
              defaultValue={v.category ?? ''}
              error={err.category}
            />
            <SelectField
              name="condition"
              label="Estado"
              options={options(CONDITION_LABEL)}
              defaultValue={v.condition || 'GOOD'}
              error={err.condition}
            />
          </div>
        )}

        <TextareaField
          name="description"
          label="Descripción"
          placeholder={isService ? 'Qué haces, con qué experiencia, qué incluye…' : 'Cómo está, qué incluye, cómo se entrega…'}
          defaultValue={v.description}
          error={err.description}
          maxLength={2000}
        />

        {kind === 'SALE' && (
          <Field name="price" label="Precio (MXN)" inputMode="decimal" placeholder="$0" defaultValue={v.price} error={err.price} />
        )}

        {kind === 'RENT' && (
          <>
            <div className={styles.row}>
              <Field
                name="rentalRate"
                label="Tarifa (MXN)"
                inputMode="decimal"
                placeholder="$0"
                defaultValue={v.rentalRate}
                error={err.rentalRate}
              />
              <SelectField
                name="rentalPeriod"
                label="Cobras"
                options={(Object.keys(RENTAL_PERIOD_LABEL) as (keyof typeof RENTAL_PERIOD_LABEL)[]).map((p) => ({
                  value: p,
                  label: RENTAL_PERIOD_LABEL[p].label,
                }))}
                defaultValue={v.rentalPeriod || 'DAY'}
                error={err.rentalPeriod}
              />
            </div>
            <Field
              name="deposit"
              label="Depósito (MXN)"
              inputMode="decimal"
              placeholder="$0"
              hint="Te protege si el objeto regresa dañado. Se devuelve al entregarlo bien. Pon 0 si no pides depósito."
              defaultValue={v.deposit}
              error={err.deposit}
            />
          </>
        )}

        {kind === 'BARTER' && (
          <>
            <TextareaField
              name="barterWants"
              label="¿Qué buscas a cambio?"
              placeholder="Ej. tornamesa, clases de guitarra"
              hint="Separa con comas. Hasta 10 cosas."
              rows={2}
              defaultValue={v.barterWants}
              error={err.barterWants}
            />
            <label className={styles.check}>
              <input type="checkbox" name="acceptsServices" defaultChecked={v.acceptsServices === 'on'} />
              <span>También acepto un servicio a cambio</span>
            </label>
          </>
        )}

        {isService && (
          <>
            <div className={styles.row}>
              <SelectField
                name="pricingModel"
                label="¿Cómo cobras?"
                options={(Object.keys(PRICING_MODEL_LABEL) as PricingModel[]).map((m) => ({
                  value: m,
                  label: PRICING_MODEL_LABEL[m].label,
                }))}
                defaultValue={defaultPricing}
                onChange={(e) => setPricing(e.target.value as PricingModel)}
                hint={PRICING_MODEL_LABEL[pricing].hint}
                error={err.pricingModel}
              />
              {pricing !== 'QUOTE' && (
                <Field
                  name="basePrice"
                  label={pricing === 'HOURLY' ? 'Tarifa por hora (MXN)' : 'Precio (MXN)'}
                  inputMode="decimal"
                  placeholder="$0"
                  defaultValue={v.basePrice}
                  error={err.basePrice}
                />
              )}
            </div>
            <SelectField
              name="coverageRadiusKm"
              label="¿Hasta dónde vas?"
              options={[1, 2, 3, 5, 8, 10, 15].map((km) => ({ value: String(km), label: `${km} km a la redonda` }))}
              defaultValue={v.coverageRadiusKm || '3'}
              error={err.coverageRadiusKm}
            />
          </>
        )}

        <CommissionHint kind={kind} amount={amount} quote={isService && pricing === 'QUOTE'} />

        <Field
          name="neighborhood"
          label="Colonia"
          autoComplete="address-level3"
          hint="Solo se muestra la colonia, nunca tu dirección."
          defaultValue={v.neighborhood ?? defaultNeighborhood}
          error={err.neighborhood}
          maxLength={80}
        />
      </div>

      <ImagePicker enabled={uploadsEnabled} onBusyChange={onBusyChange} error={err.images} initial={initialImages} />

      {(pending || uploading) && <LoadingOverlay label={uploading ? 'Subiendo fotos…' : editing ? 'Guardando…' : 'Publicando…'} />}
      <SubmitButton
        pending={pending || uploading}
        pendingLabel={uploading ? 'Subiendo fotos…' : editing ? 'Guardando…' : 'Publicando…'}
      >
        {editing ? 'Guardar cambios' : 'Publicar'}
      </SubmitButton>
    </form>
  );
}

const AMOUNT_FIELDS = ['price', 'rentalRate', 'basePrice'];

/** Modelo de negocio a la vista: 5% al cerrar (se descuenta al vendedor), intercambio gratis. */
function CommissionHint({ kind, amount, quote }: { kind: CardKind; amount: string; quote: boolean }) {
  if (kind === 'BARTER') {
    return <p className={styles.commission}>El intercambio no paga comisión.</p>;
  }
  const value = Number(amount.replace(',', '.'));
  const rate = formatRate(COMMISSION_RATE);
  if (quote || !Number.isFinite(value) || value <= 0) {
    return (
      <p className={styles.commission}>
        Bara Bara cobra {rate} del precio que acuerden, solo cuando se cierra el trato. Tu vecino paga el precio
        publicado{kind === 'RENT' ? '; la fianza no paga comisión' : ''}.
      </p>
    );
  }
  const split = splitAmount(kind, value);
  return (
    <p className={styles.commission} aria-live="polite">
      Recibirás <strong>{formatMoney(split.net)}</strong> · comisión Bara Bara {rate}: {formatMoney(split.commission)}
      {kind === 'RENT' ? ' por cada renta. La fianza no paga comisión.' : ', solo al cerrar el trato.'}
    </p>
  );
}
