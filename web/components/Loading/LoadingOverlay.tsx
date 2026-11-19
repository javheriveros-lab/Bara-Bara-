'use client';

import { createPortal } from 'react-dom';
import { ThunderLoader } from './ThunderLoader';

/**
 * Cubre la pantalla mientras corre un proceso (publicar, enviar documentos). Se monta en <body>
 * para que ningún contenedor con transform o backdrop-filter recorte el position: fixed.
 * Quien lo usa lo renderiza solo mientras `pending` es true.
 */
export function LoadingOverlay({ label }: { label: string }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<ThunderLoader variant="overlay" label={label} />, document.body);
}
