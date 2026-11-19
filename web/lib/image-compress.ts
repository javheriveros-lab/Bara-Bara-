const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Reduce a 1600px en el lado mayor y recomprime como JPEG (ahorra datos al subir).
 * Si el navegador no puede decodificarla (p. ej. HEIC o PDF), se sube tal cual.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  return blob && blob.size < file.size ? blob : file;
}
