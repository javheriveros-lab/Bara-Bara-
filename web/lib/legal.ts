// Datos del responsable para el aviso de privacidad, los términos y el contacto.
// Se llenan con variables de entorno (Vercel → Settings → Environment Variables) para no
// dejar datos personales en el código. Mientras falten, se ve un marcador visible.

const pending = (what: string) => `[POR DEFINIR: ${what}]`;

export const LEGAL = {
  /** Nombre completo de la persona física responsable (o razón social si después se constituye). */
  responsible: process.env.NEXT_PUBLIC_LEGAL_NAME || pending('nombre del responsable'),
  /** Domicilio para oír y recibir notificaciones (puede ser solo ciudad y estado si se prefiere). */
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || pending('domicilio o ciudad y estado'),
  /** Correo para soporte, derechos ARCO y reportes. */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || pending('correo de contacto'),
  /** Versión vigente de los textos. Debe coincidir con TERMS_VERSION del backend. */
  version: '2026-11',
  updated: '13 de noviembre de 2026',
};

export const isLegalComplete = () =>
  Boolean(process.env.NEXT_PUBLIC_LEGAL_NAME && process.env.NEXT_PUBLIC_LEGAL_ADDRESS && process.env.NEXT_PUBLIC_CONTACT_EMAIL);
