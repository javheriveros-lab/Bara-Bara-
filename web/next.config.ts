import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bara/shared'],
  // Metadatos (title, description, Open Graph) siempre en el <head> del HTML inicial, para todos los
  // navegadores y analizadores, en vez de transmitirse después.
  htmlLimitedBots: /.*/,
  experimental: {
    // CSS en línea dentro del HTML: quita las hojas que bloquean el primer pintado (son ~10 KB).
    inlineCss: true,
  },
  // Raíz del monorepo (pnpm). Sin esto Next puede tomar un package-lock.json de una carpeta superior.
  outputFileTracingRoot: path.join(__dirname, '..'),
  poweredByHeader: false,
  // Cabeceras de seguridad para todas las páginas. La CSP queda fuera a propósito: Next inyecta
  // scripts en línea y una CSP sin nonce rompería la hidratación.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
    ];
  },
  images: {
    // Cloudinary redimensiona y convierte; Next no tiene que procesar imágenes.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
};

export default nextConfig;
