'use client';

import { useEffect, useRef, useState } from 'react';
import { compressImage } from '@/lib/image-compress';
import { uploadName, uploadToImageKit } from '@/lib/imagekit-upload';
import { getUploadSignatureAction } from '@/lib/publish-actions';
import styles from './PublishForm.module.css';

const MAX_PHOTOS = 8;

interface Photo {
  key: string;
  preview: string;
  progress: number;
  url?: string;
  error?: string;
}

interface ImagePickerProps {
  enabled: boolean;
  /** Avisa si hay fotos subiendo, para bloquear el botón Publicar. */
  onBusyChange: (busy: boolean) => void;
  error?: string;
  /** Fotos ya publicadas (al editar). */
  initial?: string[];
}

export function ImagePicker({ enabled, onBusyChange, error, initial = [] }: ImagePickerProps) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initial.map((url) => ({ key: url, preview: url, url, progress: 1 })),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = photos.some((p) => !p.url && !p.error);

  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);
  // Libera las vistas previas al salir.
  const previews = useRef(new Set<string>());
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  if (!enabled) {
    return (
      <div className={styles.pickerField}>
        <span className={styles.pickerLabel}>Fotos</span>
        <p className={styles.pickerNote}>
          {initial.length
            ? `Se conservan tus ${initial.length} fotos. Por ahora no se pueden cambiar.`
            : 'La subida de fotos todavía no está activada. Puedes publicar sin fotos.'}
        </p>
        {initial.map((url) => (
          <input key={url} type="hidden" name="images" value={url} />
        ))}
      </div>
    );
  }

  const update = (key: string, patch: Partial<Photo>) =>
    setPhotos((all) => all.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const selected = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);

    const added = selected.map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return { file, photo: { key: crypto.randomUUID(), preview, progress: 0 } satisfies Photo };
    });
    setPhotos((all) => [...all, ...added.map((a) => a.photo)]);
    if (inputRef.current) inputRef.current.value = '';

    // En serie: con señal intermitente es mejor terminar una foto que tener ocho a medias.
    for (const { file, photo } of added) {
      try {
        const [blob, sig] = await Promise.all([compressImage(file), getUploadSignatureAction()]);
        if (!sig.ok) throw new Error(sig.message);
        const { url } = await uploadToImageKit(blob, uploadName(file.name, blob), sig.signature, (progress) =>
          update(photo.key, { progress }),
        );
        update(photo.key, { url, progress: 1 });
      } catch (e) {
        update(photo.key, { error: e instanceof Error ? e.message : 'No se pudo subir' });
      }
    }
  }

  function remove(key: string) {
    setPhotos((all) => {
      const p = all.find((x) => x.key === key);
      if (p?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(p.preview);
        previews.current.delete(p.preview);
      }
      return all.filter((x) => x.key !== key);
    });
  }

  return (
    <div className={styles.pickerField}>
      <span className={styles.pickerLabel} id="photos-label">
        Fotos <span className={styles.pickerCount}>({photos.length}/{MAX_PHOTOS})</span>
      </span>

      <ul className={styles.thumbs} aria-labelledby="photos-label">
        {photos.map((p, i) => (
          <li key={p.key} className={styles.thumb} data-state={p.error ? 'error' : p.url ? 'done' : 'uploading'}>
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
            <img src={p.preview} alt={`Foto ${i + 1}`} />
            {!p.url && !p.error && (
              <span className={styles.progress} role="progressbar" aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${Math.max(p.progress, 0.05) * 100}%` }} />
              </span>
            )}
            {p.error && <span className={styles.thumbError}>{p.error}</span>}
            <button type="button" className={styles.remove} onClick={() => remove(p.key)} aria-label={`Quitar foto ${i + 1}`}>
              ×
            </button>
            {p.url && <input type="hidden" name="images" value={p.url} />}
          </li>
        ))}

        {photos.length < MAX_PHOTOS && (
          <li>
            <label className={styles.addPhoto}>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.visuallyHidden}
                onChange={(e) => addFiles(e.target.files)}
              />
              <span aria-hidden>+</span>
              <span>Agregar</span>
            </label>
          </li>
        )}
      </ul>

      <p className={error ? styles.pickerError : styles.pickerNote}>
        {error ?? 'La primera foto es la portada. Las reducimos antes de subirlas para ahorrar tus datos.'}
      </p>
    </div>
  );
}
