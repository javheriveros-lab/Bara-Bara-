'use client';

import type { PrivateUpload as Uploaded } from '@bara/shared';
import { useId, useState } from 'react';
import { getPrivateSignatureAction } from '@/lib/account-actions';
import { compressImage } from '@/lib/image-compress';
import { uploadName, uploadToImageKit } from '@/lib/imagekit-upload';
import styles from './PrivateUpload.module.css';

const MAX_BYTES = 10 * 1024 * 1024; // la API rechaza documentos más pesados

interface PrivateUploadProps {
  purpose: 'kyc' | 'payment';
  /** Nombre del input oculto con el fileId de ImageKit. */
  name: string;
  label: string;
  hint?: string;
  error?: string;
}

type State = { step: 'idle' } | { step: 'uploading'; progress: number; fileName: string } | { step: 'done'; fileName: string; file: Uploaded } | { step: 'error'; message: string };

/**
 * Sube un documento (foto o PDF) directo a la carpeta privada del vecino en ImageKit, como archivo privado.
 * Sin firma no se puede ver: la API comprueba el archivo y el admin lo ve con un enlace temporal.
 */
export function PrivateUpload({ purpose, name, label, hint, error }: PrivateUploadProps) {
  const [state, setState] = useState<State>({ step: 'idle' });
  const id = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setState({ step: 'error', message: 'El archivo pesa más de 10 MB' });
    setState({ step: 'uploading', progress: 0, fileName: file.name });
    try {
      const [blob, sig] = await Promise.all([compressImage(file), getPrivateSignatureAction(purpose)]);
      if (!sig.ok) throw new Error(sig.message);
      const uploaded = await uploadToImageKit(blob, uploadName(file.name, blob), sig.signature, (progress) =>
        setState({ step: 'uploading', progress, fileName: file.name }),
      );
      setState({ step: 'done', fileName: file.name, file: { fileId: uploaded.fileId, fileName: file.name } });
    } catch (e) {
      setState({ step: 'error', message: e instanceof Error ? e.message : 'No se pudo subir' });
    }
  }

  const note = state.step === 'error' ? state.message : error;

  return (
    <div className={styles.field} data-state={state.step}>
      <label htmlFor={id} className={styles.drop}>
        <span className={styles.label}>{label}</span>
        <span className={styles.status}>
          {state.step === 'idle' && 'Toca para elegir foto o PDF'}
          {state.step === 'uploading' && `Subiendo ${Math.round(state.progress * 100)}%…`}
          {state.step === 'done' && `✓ ${state.fileName}`}
          {state.step === 'error' && 'Toca para intentar de nuevo'}
        </span>
        {state.step === 'uploading' && (
          <span className={styles.bar} role="progressbar" aria-valuenow={Math.round(state.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.max(state.progress, 0.05) * 100}%` }} />
          </span>
        )}
        <input
          id={id}
          type="file"
          accept="image/*,application/pdf"
          className={styles.input}
          disabled={state.step === 'uploading'}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {state.step === 'done' && (
        <>
          <input type="hidden" name={`${name}.fileId`} value={state.file.fileId} />
        </>
      )}
      {(note || hint) && <p className={note ? styles.error : styles.hint}>{note ?? hint}</p>}
    </div>
  );
}
