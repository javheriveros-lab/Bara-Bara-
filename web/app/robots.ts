import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Áreas privadas o sin valor para buscadores.
      disallow: ['/admin', '/perfil', '/mensajes', '/guardados', '/publicar', '/api/', '/olvide', '/restablecer'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
