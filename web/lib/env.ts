// Variables de entorno del servidor de Next. En desarrollo hay valores locales por defecto;
// en producción faltar una es un error claro (mejor que un sitio que llama a localhost).

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, value: string | undefined, devDefault: string): string {
  if (value) return value.replace(/\/+$/, '');
  if (isProd) throw new Error(`Falta la variable de entorno ${name}. Configúrala en Vercel (ver DEPLOY.md).`);
  return devDefault;
}

/** API para el servidor de Next, con /api (ej. https://api.barabara.mx/api). */
export const API_URL = required('API_URL', process.env.API_URL, 'http://localhost:4000/api');

/** Origen público de la API sin /api, para el socket del chat (ej. https://api.barabara.mx). */
export const PUBLIC_API_ORIGIN = required('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL, 'http://localhost:4000');

/** URL pública del sitio (ej. https://barabara.mx): Open Graph, sitemap y robots. */
export const SITE_URL = required('SITE_URL', process.env.SITE_URL, 'http://localhost:3000');
