'use client';

import { SignalLost } from '@/components/Punk/SignalLost';

/** Si una página falla (API caída, sin red): pantalla de "sin señal" que reintenta sola. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px 72px' }}>
      <SignalLost onRetry={reset} />
    </main>
  );
}
