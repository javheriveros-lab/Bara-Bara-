# Publicar Bara Bara

Esta guía lleva Bara Bara de tu computadora a internet:

- **Web** (Next.js): Vercel.
- **API y chat** (NestJS): Railway.
- **Base de datos**: MongoDB Atlas.
- **Fotos y documentos**: ImageKit.
- **Correo**: Resend.

Los pasos que implican pagar, crear cuentas o pegar secretos los haces tú. Ningún secreto va en el código ni en git.

> Costo aproximado al arrancar:
> - Vercel Hobby, Atlas M0, ImageKit, Resend y Sentry: gratis.
> - Railway: unos USD 5 al mes.
> - Dominio: unos MXN 300 al año.
>
> Ojo: el plan Hobby de Vercel es para uso no comercial. En cuanto cobres comisiones con regularidad, pasa a Vercel Pro (USD 20 al mes).

---

## 0. Antes de empezar

1. Revisa los textos de `/terminos` y `/privacidad` (en `web/app/terminos` y `web/app/privacidad`). Son un borrador razonable, pero **no son asesoría legal**: dáselos a revisar a un abogado.
2. Ten a la mano:
   - tu nombre completo;
   - un domicilio o ciudad para el aviso de privacidad;
   - un correo de contacto (de preferencia del dominio, p. ej. `hola@tu-dominio.mx`);
   - la CLABE y el nombre del titular de la cuenta donde recibirás las comisiones.
3. Elige un secreto JWT nuevo para producción, distinto al de tu computadora:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

## 1. Dominio

Compra el dominio (Cloudflare, Namecheap, Google Domains, Neubox, Akky…). En esta guía:

- `tu-dominio.mx` → web (Vercel)
- `api.tu-dominio.mx` → API (Railway)

Configurarás los DNS en los pasos 4 y 5.

## 2. MongoDB Atlas

1. **Database Access**: crea un usuario solo para producción, con una contraseña larga.
2. **Network Access**: Railway no tiene IP fija en el plan básico, así que agrega `0.0.0.0/0`. La protección real es la contraseña del usuario de la base; usa una larga y aleatoria. Si después contratas una IP estática en Railway, sustituye la regla por esa IP.
3. **Backups**: el plan M0 no tiene respaldos automáticos. Cuando haya usuarios reales, sube a M10 o programa un `mongodump` semanal.
4. Copia la cadena de conexión: **Connect → Drivers**.
   - Debe verse así: `mongodb+srv://USUARIO:CONTRASEÑA@cluster0.XXXXX.mongodb.net/bara_bara?retryWrites=true&w=majority`.
   - La parte `cluster0.XXXXX.mongodb.net` debe ir completa. Si la contraseña lleva símbolos (`@ : / ? #`), codifícalos (por ejemplo, `@` se escribe `%40`).

## 3. Resend (correos)

1. Crea una cuenta en resend.com.
2. **Domains → Add domain** → `tu-dominio.mx`. Agrega en tu DNS los registros que te indique (SPF, DKIM) y espera a que aparezca "Verified".
3. **API Keys → Create** (permiso "Sending access"). Guárdala: es `RESEND_API_KEY`.

Sin Resend el sitio funciona, pero "Olvidé mi contraseña" no enviará correos: el enlace solo queda en el log del backend.

## 4. Railway (API y chat)

1. Sube el proyecto a un repositorio **privado** de GitHub. El archivo `.env` ya está en `.gitignore`; confirma que no se suba.
2. En Railway, crea un proyecto con **Deploy from GitHub repo** y elige el repositorio. Railway lee `railway.json` en la raíz:
   - build: instala con pnpm y compila `backend`;
   - arranque: `node backend/dist/main`;
   - health check: `/api/health`.
3. En **Variables**, agrega:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | la cadena de Atlas del paso 2 |
| `JWT_SECRET` | el secreto nuevo del paso 0 |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://tu-dominio.mx,https://www.tu-dominio.mx` |
| `SITE_URL` | `https://tu-dominio.mx` |
| `TRUST_PROXY` | `2` (proxy de Railway + servidor de Vercel) |
| `IMAGEKIT_URL_ENDPOINT` / `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` | las de tu panel de ImageKit |
| `RESEND_API_KEY` | la del paso 3 |
| `MAIL_FROM` | `Bara Bara <hola@tu-dominio.mx>` |
| `PAYMENT_CLABE` | tu CLABE (18 dígitos) |
| `PAYMENT_BENEFICIARY` | nombre del titular, tal como aparece en el banco |
| `PAYMENT_BANK_NAME` | tu banco |
| `SENTRY_DSN` | opcional (paso 7) |

   No definas `PORT`: Railway lo asigna solo.
4. **Settings → Networking → Custom Domain** → `api.tu-dominio.mx`. Railway te da un registro CNAME para tu DNS.
5. Comprueba que `https://api.tu-dominio.mx/api/health` responda `{"status":"ok", … "database":"up"}`.

Si la API no arranca, revisa los logs. Los mensajes más comunes:

- "CORS_ORIGIN es obligatorio en producción";
- "JWT_SECRET falta o es inseguro";
- un error de conexión a la base (cadena incompleta o IP no permitida en Atlas).

## 5. Vercel (web)

1. **Add New → Project** → el mismo repositorio.
2. **Root Directory**: `web`. Deja activada la opción "Include files outside the root directory", porque la web usa `packages/shared`. Vercel lee `web/vercel.json`.
3. **Environment Variables** (Production):

| Variable | Valor |
| --- | --- |
| `API_URL` | `https://api.tu-dominio.mx/api` |
| `NEXT_PUBLIC_API_URL` | `https://api.tu-dominio.mx` |
| `SITE_URL` | `https://tu-dominio.mx` |
| `NEXT_PUBLIC_LEGAL_NAME` | tu nombre completo |
| `NEXT_PUBLIC_LEGAL_ADDRESS` | domicilio, o ciudad y estado |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hola@tu-dominio.mx` |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | opcionales (paso 7) |

   Si falta `API_URL`, `NEXT_PUBLIC_API_URL` o `SITE_URL`, el build falla a propósito, con un mensaje que dice cuál falta.
4. **Settings → Domains** → agrega `tu-dominio.mx` y `www.tu-dominio.mx` y configura los registros DNS que te indique Vercel.
5. Abre `https://tu-dominio.mx`. Ya no debe aparecer el aviso rojo de "Borrador" en `/privacidad`.

## 6. Primeros pasos con la base real

Desde tu computadora, con `DATABASE_URL` apuntando a la base de producción en `backend/.env`:

```bash
# 1. Sincroniza índices y colecciones con el esquema actual
npx pnpm@9.15.0 db:push

# 2. Borra los datos de demostración (solo cuentas @demo.barabara.mx)
npx pnpm@9.15.0 db:seed:clean

# 3. Regístrate en el sitio con tu correo y luego hazte admin
npx pnpm@9.15.0 --filter backend make-admin tu@correo.mx
```

Después vuelve a poner en `backend/.env` la base de desarrollo, si usas otra.

## 7. Sentry (opcional, recomendado)

1. En sentry.io, crea un proyecto Node.js (API) y otro Next.js (web). El plan gratis alcanza.
2. Copia cada DSN en `SENTRY_DSN` de Railway y en `SENTRY_DSN` y `NEXT_PUBLIC_SENTRY_DSN` de Vercel.
3. Solo se reportan errores inesperados (5xx). No se graban sesiones ni se envían datos personales.

## 8. Operación diaria

- **Comisiones**:
  - Los vecinos pagan por SPEI a tu cuenta con la referencia que les da el sitio y suben su comprobante.
  - Revisa tu banca en línea y, en `/admin → Comprobantes de pago`, confirma o rechaza cada uno.
  - Guarda tus estados de cuenta: los ingresos llegan a tu cuenta personal y son ingresos tuyos ante el SAT. Consulta a un contador sobre el régimen que te conviene (por ejemplo, RESICO o plataformas tecnológicas).
- **Verificaciones**: en `/admin → Verificaciones`. Los documentos se abren con enlaces que caducan en 10 minutos.
- **Reportes**: en `/admin → Reportes`, puedes:
  - quitar la publicación;
  - descartar el reporte;
  - suspender la cuenta. La persona no podrá entrar y sus publicaciones se ocultan. Se revierte con "Quitar suspensión".
- **Derechos ARCO**: las solicitudes llegan a tu correo de contacto. Tienes 20 días hábiles para responder.

## Lista final antes de anunciar

- [ ] `https://api.tu-dominio.mx/api/health` → `ok`.
- [ ] Registro con la casilla de términos. "Olvidé mi contraseña" envía el correo y el enlace funciona.
- [ ] Publicar con fotos. Editar, pausar y borrar desde "Mis publicaciones".
- [ ] Chat entre dos cuentas, incluso desde el celular con datos móviles.
- [ ] El botón "Pagar por SPEI" muestra tu CLABE.
- [ ] Reportar una publicación y verla en `/admin → Reportes`.
- [ ] `/privacidad` sin el aviso de "Borrador". `https://tu-dominio.mx/robots.txt` y `/sitemap.xml` responden.
- [ ] Ya no aparecen los datos de demostración.
