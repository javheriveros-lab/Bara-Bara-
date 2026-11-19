import type { UploadSignature } from '@bara/shared';

export interface UploadedFile {
  fileId: string;
  /** URL pública (en archivos privados no sirve sin firma). */
  url: string;
  name: string;
}

/**
 * Subida directa del navegador a ImageKit con la firma del backend (XHR para tener progreso).
 * El archivo nunca pasa por nuestra API.
 */
export function uploadToImageKit(
  blob: Blob,
  fileName: string,
  sig: UploadSignature,
  onProgress: (p: number) => void,
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', blob, fileName);
    body.append('fileName', fileName);
    body.append('publicKey', sig.publicKey);
    body.append('signature', sig.signature);
    body.append('expire', String(sig.expire));
    body.append('token', sig.token);
    for (const [k, v] of Object.entries(sig.params)) body.append(k, v);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { fileId?: string; url?: string; name?: string; message?: string };
        if (xhr.status < 300 && data.fileId && data.url) resolve({ fileId: data.fileId, url: data.url, name: data.name ?? fileName });
        else reject(new Error(data.message ?? 'No se pudo subir el archivo'));
      } catch {
        reject(new Error('Respuesta inválida al subir el archivo'));
      }
    };
    xhr.onerror = () => reject(new Error('Sin conexión. Intenta de nuevo.'));
    xhr.send(body);
  });
}

/** "IMG_2034.HEIC" comprimida a JPEG → "IMG_2034.jpg". ImageKit decide el tipo por la extensión. */
export function uploadName(original: string, blob: Blob): string {
  const base = original.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_').slice(0, 60) || 'archivo';
  if (blob.type === 'image/jpeg') return `${base}.jpg`;
  const ext = original.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return ext ? `${base}.${ext}` : base;
}
