'use client';

import { usePathname } from 'next/navigation';

/** La sala de chat ocupa toda la pantalla bajo el header: ahí no va el pie. */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith('/mensajes/') ? null : <>{children}</>;
}
