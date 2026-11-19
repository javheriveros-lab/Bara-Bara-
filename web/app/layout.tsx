import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { MotionProvider } from '@/components/Motion/MotionProvider';
import { FooterGate } from '@/components/SiteFooter/FooterGate';
import { SiteFooter } from '@/components/SiteFooter/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader/SiteHeader';
import { SITE_URL } from '@/lib/env';
import './globals.css';

// Una sola familia (la del diseño): menos archivos de fuente, carga más rápida.
// Los alias --font-display / --font-stencil / --font-handstyle apuntan a ella en globals.css.
const body = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  // Base de las URLs absolutas de Open Graph. En producción: SITE_URL=https://dominio.
  metadataBase: new URL(SITE_URL),
  title: 'Bara Bara · Compra, renta e intercambia con tu comunidad',
  description:
    'Compra, renta, intercambia y contrata servicios con tu comunidad. Sin especulación ni comisiones abusivas.',
  // icon.png / apple-icon.png en app/ se sirven solos como favicon.
  openGraph: {
    title: '¡Bara Bara!',
    description: 'Economía colaborativa de la comunidad: venta, renta, intercambio y servicios.',
    images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: '¡Bara Bara!' }],
    locale: 'es_MX',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={body.variable}>
      <body>
        {/* Sin JS, Framer Motion no anima: las tarjetas se muestran tal cual en vez de quedarse ocultas. */}
        <noscript>
          <style>{'.motion-feed, .motion-feed > * { opacity: 1 !important; transform: none !important; }'}</style>
        </noscript>
        <MotionProvider>
          <SiteHeader />
          {children}
          <FooterGate>
            <SiteFooter />
          </FooterGate>
        </MotionProvider>
      </body>
    </html>
  );
}
