// Loader global de next/image (next.config.ts → images.loaderFile).
// Las fotos viven en ImageKit: se pide el ancho justo, formato automático (WebP/AVIF) y sin
// agrandar, así un celular de gama de entrada no descarga 1600px para una tarjeta.
// https://imagekit.io/docs/image-transformation

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

const IMAGEKIT = /^https:\/\/ik\.imagekit\.io\//;

export default function imageKitLoader({ src, width, quality }: LoaderArgs): string {
  if (!IMAGEKIT.test(src) || src.includes('?')) return src;
  return `${src}?tr=w-${width},q-${quality ?? 75},f-auto,c-at_max`;
}
