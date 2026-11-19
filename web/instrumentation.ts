// Monitoreo de errores del servidor de Next. Solo se activa si hay SENTRY_DSN.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
