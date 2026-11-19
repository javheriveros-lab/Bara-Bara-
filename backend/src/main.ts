import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { SentryFilter } from './common/monitoring/sentry.filter';
import { validationExceptionFactory } from './common/validation/validation-exception.factory';

const isProd = process.env.NODE_ENV === 'production';

// Monitoreo de errores: solo si hay DSN. Sin datos personales (por defecto no se envían).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,
  });
}

async function bootstrap() {
  // rawBody: el webhook de pagos verifica la firma HMAC sobre el cuerpo tal como llegó.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // La web llama a la API desde el servidor de Next reenviando la IP del vecino en X-Forwarded-For.
  // Solo se confía en esa cabecera si llega de un proxy conocido; si no, el rate limit
  // vería una sola IP para todos (o cualquiera podría falsificarla).
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY ?? 'loopback'));

  // La API solo sirve JSON: helmet con sus valores por defecto (CSP incluida) no estorba.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  // En producción solo se aceptan los orígenes declarados; en desarrollo, cualquiera.
  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  if (isProd && !origins?.length) {
    throw new Error('CORS_ORIGIN es obligatorio en producción (ej. https://barabara.mx,https://www.barabara.mx).');
  }
  app.enableCors({ origin: origins?.length ? origins : true, credentials: true });
  // forbidNonWhitelisted: un campo desconocido es error (400), no se ignora en silencio.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  if (process.env.SENTRY_DSN) app.useGlobalFilters(new SentryFilter(app.get(HttpAdapterHost).httpAdapter));
  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`⚡ Bara Bara API en http://localhost:${port}/api`);
}

/** "false" | número de saltos | lista de IPs/subredes o alias de Express ("loopback, 10.0.0.0/8"). */
function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

bootstrap();
