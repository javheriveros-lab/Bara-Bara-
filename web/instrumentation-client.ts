// Monitoreo de errores en el navegador. Solo se carga si hay NEXT_PUBLIC_SENTRY_DSN
// (import dinámico: sin DSN, el sitio no descarga ni un byte de Sentry).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import('@sentry/nextjs').then((Sentry) =>
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
      // Sin grabación de sesiones: no capturamos lo que la gente escribe o ve.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    }),
  );
}
