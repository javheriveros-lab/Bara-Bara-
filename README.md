# ⚡ Bara Bara

Economía colaborativa para el barrio: venta y renta de segunda mano, trueque local y Chamba de Barrio.

> **Publicar en internet:** ver [DEPLOY.md](DEPLOY.md) (Vercel + Railway + Atlas + Resend). Prueba de humo: `npx pnpm@9.15.0 --filter backend smoke` con la API corriendo.

## Estructura

| Carpeta           | Qué es                                                     |
| ----------------- | ---------------------------------------------------------- |
| `backend/`        | API NestJS + Prisma (MongoDB) + WebSockets (socket.io)     |
| `web/`            | Next.js 15 (App Router, SSR)                               |
| `mobile/`         | Expo (Expo Router) — consume la misma API                  |
| `packages/shared` | `@bara/shared`: tipos y tokens de diseño para web y mobile |

## Arranque

Sin pnpm global, usa `npx pnpm@9.15.0` en lugar de `pnpm`.

```bash
pnpm install
cp .env.example backend/.env   # pon tu DATABASE_URL y un JWT_SECRET propio
pnpm db:push                   # crea colecciones e índices (MongoDB no usa migraciones)
pnpm dev:backend               # http://localhost:4000/api/health → database: "up"
pnpm dev:web                   # http://localhost:3000
pnpm dev:mobile                # Expo
pnpm db:studio                 # explorar datos con Prisma Studio
```

### Base de datos: MongoDB Atlas (gratis)

1. Crea una cuenta en <https://www.mongodb.com/cloud/atlas/register> y un clúster **M0 (Free)**. Región cercana: AWS `us-east-1` o GCP `us-central1`.
2. **Database Access** → crea un usuario con contraseña (rol *Read and write to any database*). Evita caracteres especiales en la contraseña o codifícalos en la URL (`@` → `%40`).
3. **Network Access** → *Add IP Address* → *Add current IP address* (en desarrollo puedes usar `0.0.0.0/0`, nunca en producción).
4. **Connect → Drivers** → copia la cadena `mongodb+srv://…` y **agrega el nombre de la base** antes del `?`:
   `mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/bara_bara?retryWrites=true&w=majority`
5. Pégala en `DATABASE_URL` de `backend/.env` y ejecuta `pnpm db:push`.

**Local (opcional, requiere Docker):** `pnpm db:up` levanta `mongo:7` como replica set de un nodo (Prisma lo necesita para transacciones) y se usa la URL comentada en `.env.example`.

**Notas del esquema en MongoDB:** IDs `ObjectId` (las rutas validan el formato y responden 400 si es inválido), montos en `Float` (el conector no soporta `Decimal`) y sin claves compuestas.

## API (prefijo `/api`)

| Método | Ruta                              | Auth | Notas                                                     |
| ------ | --------------------------------- | ---- | --------------------------------------------------------- |
| POST   | `/auth/register`                  | —    | Devuelve `{ accessToken, user }`. Límite 5/min            |
| POST   | `/auth/login`                     | —    | Devuelve `{ accessToken, user }`. Límite 10/min           |
| POST   | `/auth/forgot` · `/auth/reset`    | —    | Correo con enlace de 30 min, un solo uso (siempre responde 200). Límite 3/min · 10/min |
| GET    | `/users/me` · `/users/:id`        | ✓ · — | `:id` solo expone el perfil público                      |
| PATCH · POST | `/users/me` · `/users/me/password` | ✓ | Nombre y colonia · cambio de contraseña con la actual |
| POST   | `/listings` · `/services`         | ✓    | Validación por `type` / `pricingModel` (ver DTOs)          |
| GET    | `/listings` · `/services` (+`/:id`) | —  | Filtros: `q` (texto en título y descripción), `type`/`category`, `neighborhood`, `take`, `skip` |
| GET    | `/listings/mine` · `/services/mine` | ✓  | Lo del dueño, menos lo borrado                             |
| PUT · POST · DELETE | `/listings/:id` (`/status`) · igual en `/services` | ✓ dueño | Editar · `{ status: ACTIVE|PAUSED|CLOSED }` · borrado lógico (`REMOVED`). Otro usuario: 403 |
| POST   | `/reports`                        | ✓    | `{ listingId|serviceId, reason, note? }`. Límite 10/hora   |
| POST   | `/conversations`                  | ✓    | `{ listingId }` o `{ serviceId }` (solo si está activa); reutiliza si ya existe |
| GET    | `/conversations` · `/:id/messages` | ✓   | Historial: `before` / `after` (ISO), `take`                |
| GET · POST | `/conversations/:id/deal`     | ✓    | Trato vigente · el vendedor propone `{ amount }`           |
| POST   | `/deals/:id/confirm` · `/cancel`  | ✓    | El comprador confirma; cualquiera cancela una propuesta    |
| GET    | `/commissions`                    | ✓    | Estado de cuenta (pendiente, vencido, tratos, pagos)       |
| POST   | `/commissions/payments` (+`/:id/proof`) | ✓ | Referencia SPEI · comprobante                        |
| GET/POST/DELETE | `/saved` · `/saved/keys` · `/saved/:kind/:id` | ✓ | Guardados (el "carrito"): `{ kind: listing|service, id }` |
| GET    | `/search/suggest?q=` | —  | Autocorrector: `{ corrected, suggestions }`. Vocabulario de títulos activos, categorías y palabras base; sin acentos ni mayúsculas, tolera 1-2 errores (Damerau-Levenshtein) y restituye acentos |
| POST   | `/payments/webhook`               | HMAC | Conciliación automática (ver abajo)                        |
| GET · POST | `/verification/me` · `/verification` | ✓ | Estado · enviar INE (frente/reverso) + domicilio   |
| GET · POST | `/admin/verifications` · `/admin/payments` | ADMIN | Revisión manual (`/approve`, `/reject` con `note`) |
| GET · POST | `/admin/reports` (`/:id/remove`, `/:id/dismiss`) · `/admin/users/:id/suspend` · `/unsuspend` | ADMIN | Moderación: quitar, descartar, suspender (`note`) |

Auth: `Authorization: Bearer <accessToken>`.

**Chat (socket.io, namespace `/chat`):** `io(API + '/chat', { auth: { token } })` → emitir `message:send` `{ conversationId, body }`; escuchar `message:new` y `exception`. Sin token válido la conexión se rechaza (`connect_error`).

## Datos demo

```bash
npx pnpm@9.15.0 db:seed         # 6 vecinos, 9 publicaciones y 5 chambas de ejemplo (borra el demo anterior, no duplica)
npx pnpm@9.15.0 db:seed:clean   # borra solo lo demo
```

Todo lo demo pertenece a vecinos `@demo.barabara.mx` con contraseña aleatoria (no se puede entrar con ellos). Nunca toca datos reales.

## Fotos y documentos (ImageKit)

1. Crea una cuenta gratis en <https://imagekit.io/registration>.
2. En el panel, entra a **Developer options** y copia *URL-endpoint*, *Public key* y *Private key* en `backend/.env`:
   `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`.
3. Reinicia el backend. `GET /api/uploads/status` debe responder `{ "enabled": true }`.

**Fotos de publicaciones:**
- El navegador reduce la foto (1600 px, JPEG 80%) y pide una firma a `POST /api/uploads/signature` por medio de una Server Action, así que el token no sale de la cookie.
- Con esa firma sube **directo a ImageKit**, a la carpeta `/bara-bara/u/<userId>`.
- Al publicar, la API solo acepta URLs de esa carpeta y de esta cuenta.
- Las tarjetas piden a ImageKit el ancho exacto en WebP/AVIF (`web/lib/image-loader.ts`).
- Sin credenciales se puede publicar, pero sin fotos.

**Documentos privados** (INE, comprobante de domicilio y comprobantes de pago):
- Se suben como archivos privados de ImageKit a `/bara-bara/private/<kyc|payment>/<userId>`.
- La firma de subida de ImageKit no amarra la carpeta ni la marca de privado. Por eso, al enviarlos, la API consulta el archivo en ImageKit (`GET /v1/files/:id/details`) y exige que sea de la carpeta del vecino, privado, foto o PDF y de 10 MB o menos.
- Si llega uno público en la carpeta privada, se borra.
- La base guarda la ruta del archivo, nunca una URL pública, y el admin los ve con URLs firmadas de 10 minutos.

## Chat de negociación

- **Negociar** en `/p/:id` y `/s/:id` (Server Action, funciona sin JS) abre o reutiliza la conversación y lleva a `/mensajes/:id`. En tu propia publicación no aparece.
- `/mensajes`: bandeja con último mensaje y punto de no leído; el ícono del header también lo muestra (`GET /api/conversations/unread-count`).
- **Socket en el navegador:** la sesión vive en una cookie httpOnly, así que la sala pide por Server Action un **token de socket de 2 minutos** (`POST /api/auth/socket-token`, `typ: 'socket'`) en cada (re)conexión. Ese token solo abre el socket: la API REST lo rechaza. Mobile puede conectar con su access token.
- **Señal intermitente:** al reconectar, la sala pide lo que llegó mientras no había conexión (`GET /conversations/:id/messages?after=`). Si envías sin conexión, el mensaje queda "No se envió · Reintentar" (no se encola, para no duplicar).
- Leído: abrir la conversación o el evento `conversation:read` actualiza `lastReadAt`.

## Comisiones (modelo de negocio)

- **5% en Venta, Renta y Chamba; Trueque gratis.** Se descuenta al vendedor/prestador: el comprador paga el precio acordado. En renta se cobra sobre la tarifa, **nunca sobre la fianza**. La regla vive en `packages/shared/src/commission.ts` (lo que muestra la web) y en `backend/src/modules/billing/commission.ts` (lo que se registra); mantenlas iguales.
- **Registrar trato:** en la sala del chat, quien publicó toca *Cerrar trato* y propone el precio final; la otra parte lo confirma. Al confirmar se crea la comisión pendiente con 7 días para pagar, y la venta o el trueque pasan a `RESERVED`. Cada paso deja un aviso en el historial y llega en vivo (`deal:update`).
- **Pago por SPEI:** en `/perfil/comisiones` se genera una referencia única (`BB-XXXXXXXX`) con el monto exacto y la CLABE de `PAYMENT_CLABE`/`PAYMENT_BENEFICIARY`. Se concilia de dos formas:
  - **Automática:** el banco o agregador (STP, Conekta, OpenPay…) llama a `POST /api/payments/webhook` con `{ reference, amount, providerTxId }` y la cabecera `X-BaraBara-Signature` = HMAC-SHA256 (hex) del cuerpo con `PAYMENT_WEBHOOK_SECRET`. Es idempotente por `providerTxId` y busca la referencia dentro del concepto. Cada proveedor manda su propio formato: al contratarlo hay que adaptar este endpoint a su payload y su firma.
  - **Manual:** el vecino sube su comprobante (archivo privado en ImageKit) y un admin lo confirma en `/admin?tab=pagos`.
- **Penalización:** con una comisión vencida no se puede publicar (403) y sus publicaciones se ocultan del feed hasta pagar. Se revisa al publicar y en un barrido cada hora.
- **Vecino Confiable:** insignia pública para quien tiene ≥3 comisiones pagadas, nada vencido y ningún pago tardío en 90 días.

## Moderación de publicaciones

Se rechaza cualquier publicación o chamba cuyo título, descripción, categoría o "qué buscas a cambio" mencione:

- **Artículos robados o ajenos:** "robado", "sin factura", "de dudosa procedencia", "IMEI reportado", "era de Juan"…
- **Armas:** de fuego, blancas (puñal, navaja automática…), municiones y explosivos.
- **Drogas:** sustancias ilícitas y psicotrópicos (marihuana, cocaína, clonazepam…).
- **Servicios sexuales:** acompañantes, masajes eróticos, contenido para adultos…

Cómo funciona:

- **Dónde se revisa:** en tres capas. El navegador avisa al instante sin enviar nada; la Server Action revisa otra vez (así funciona sin JavaScript); y la API es la que manda: responde `400` con `code: "PROHIBITED_CONTENT"`, el aviso general y el motivo por campo, y nada se guarda en MongoDB.
- **Normalización:** el texto pasa a minúsculas y sin acentos, y se deshacen los disfraces más comunes: "R0B4D0", "r.o.b.a.d.o", "robaaado".
- **Coincidencias:** se buscan palabras o frases completas, no fragmentos, así que "armario" o "se arma en 5 minutos" no se bloquean. Hay excepciones explícitas para usos legítimos, como "pistola de silicón" o "bala de gas".
- **Mensajes:** el vecino ve la categoría del problema, nunca la palabra detectada, para no enseñar cómo esquivar el filtro.
- **Dónde vive la regla:** `packages/shared/src/moderation.ts` y su copia idéntica `backend/src/common/moderation/moderation.ts`. Para agregar términos, edita uno, cópialo sobre el otro y corre `npx pnpm@9.15.0 check:moderation`. El `typecheck` también lo verifica.
- **Limitaciones:** es un filtro de palabras. Frena lo explícito, pero no sustituye la revisión humana ni un sistema de reportes de vecinos.

## Verificación de identidad (opcional)

- `/perfil/verificacion`: INE (frente y reverso) + comprobante de domicilio. Se suben directo a ImageKit como archivos privados en `/bara-bara/private/kyc/<userId>`: sin firma no se pueden ver. La API comprueba cada archivo y solo guarda su ruta.
- Revisión manual en `/admin`: el admin ve los documentos con enlaces firmados que caducan en 10 minutos, y aprueba o rechaza con un motivo que el vecino ve para reintentar. A los demás vecinos solo les llega la insignia *Verificado*.
- Crear un admin: `npx pnpm@9.15.0 --filter backend make-admin tu@correo.mx` (`--revoke` lo quita). El rol se comprueba en la base en cada petición.

## Sesión en la web

- `/entrar` y `/registro` usan **Server Actions**: el servidor de Next llama a `/api/auth/*` y guarda el JWT en la cookie `bb_session` (`httpOnly`, `SameSite=Lax`, caduca con el token). El JavaScript del navegador nunca ve el token.
- `web/middleware.ts` protege `/perfil`, `/publicar`, `/mensajes` y `/admin` (redirige a `/entrar?next=…`); cada página privada confirma la sesión con `getCurrentUser()` contra `/api/users/me`.
- Los formularios funcionan también sin JavaScript y muestran los errores por campo (`fields` en los 400 de la API).
- Variables de la web en `web/.env.local`: `API_URL=http://localhost:4000/api` (solo servidor).
- **Rate limit por IP real:** Next reenvía la IP del vecino en `X-Forwarded-For` y la API solo confía en ella si llega de `TRUST_PROXY` (por defecto `loopback`). En producción, pon ahí la IP o subred del servidor web.
- Con `next start` la cookie lleva `Secure`: funciona en `http://localhost`, pero para probar desde el celular por IP de la red local usa `dev:web`.

## Guía visual

- **Estado de carga "Esfera y trueno"** (web y móvil): no es pantalla de inicio; aparece solo mientras hay un proceso asíncrono. El logo oficial aparece sobre el degradado; en bucle de 2.4 s un rayo amarillo cae sobre la esfera, destella y la esfera se recarga en violeta. `web/components/Loading/ThunderLoader`: `LoadingSpinner` (`app/loading.tsx`), `LoadingOverlay` (mientras `pending`; aparece tras 180 ms) y `CardSkeletonLoader`/`FeedSkeleton`. Solo CSS sobre transform/opacity con container queries; logo con `srcset` 480/800 y carga diferida en las tarjetas. Móvil: `mobile/src/components/LoadingSpinner`. Con *reducir movimiento*: solo el logo y su halo.

- **Logo oficial** en `web/public/brand/`: versión blanca con la base de la esfera en rojo, derivada del oficial, `logo-horizontal-white.webp` (header) y `logo-splash-white-480/800.webp` (loader); originales `logo-horizontal.png`, `logo-splash.*`, `logo.png`/`logo.webp`, `isotipo.png`, `og.png`. Favicon: `web/app/icon.png` y `apple-icon.png`.

- Sistema completo en **`DESIGN.md`** (tokens + reglas) y contexto de producto en **`PRODUCT.md`**. Estética de tienda: fondo morado que se difumina en rojo (capa fija `body::before`, no se repinta al hacer scroll), paneles de vidrio, tipografía Poppins, degradado rojo → violeta solo para la acción principal y violeta eléctrico `#7C4DFF` para búsqueda y estados activos.
- Distribución tipo Mercado Libre con el estilo de Bara Bara. Header (`components/SiteHeader`): fila 1 logo blanco · buscador ancho (`components/SearchBar`, GET `/buscar?q=`) · "Publica gratis"; fila 2 "Tu colonia" · "Categorías ▾" (`components/CategoriesMenu`) y los 4 pilares (`components/PillarNav`, abren `/buscar?tipo=`) · Crea tu cuenta / Ingresa / Mis tratos / **Guardados** (carrito con contador). Portada (`components/Home`): carrusel con mensajes de la marca, 6 tarjetas de acceso rápido montadas encima, filas horizontales de productos por pilar, caja de categorías con la foto más reciente de cada una, franja de confianza y pie (`components/SiteFooter`). Resultados en `/buscar` (`q`, `tipo`, `categoria`, `colonia`). Los enlaces viejos `/?tipo=…` redirigen a `/buscar?tipo=…`. El buscador tiene **autocorrector**: mientras escribes sugiere «¿Quisiste decir…?» y publicaciones (`/api/sugerencias`, teclado ↑/↓/Enter/Esc); en `/buscar`, si lo escrito no da resultados y hay corrección, muestra los de la corrección con enlace a «Buscar exactamente» (`exacto=1`).
- Tarjetas (`components/ListingCard`): vidrio translúcido, radio 20px, foto cuadrada, tipo en píldora violeta, título, precio protagonista. Al pasar el cursor (solo puntero fino) suben 4px; al presionar, `scale(.985)`. En el detalle, botón "Guardar" (`components/SaveButton`, optimista).
- Movimiento: ease-out fuerte `cubic-bezier(0.23, 1, 0.32, 1)`, 120-260 ms; resortes críticamente amortiguados; hover solo con puntero fino. Rendimiento (Lighthouse en build de producción, portada): escritorio 99 · celular 93, accesibilidad, buenas prácticas y SEO 100. CSS en línea (`experimental.inlineCss`), metadatos siempre en el `<head>` (`htmlLimitedBots`), imágenes WebP con `srcset`, una sola familia tipográfica. Sin JS las tarjetas se ven igual (`<noscript>` en `layout.tsx`); todo respeta *reducir movimiento*.
- Neón violeta `#BB86FC`: bordes con glow, iconos activos, destacados
- Rayo amarillo `#FDD835`: **solo** logo y CTAs críticos
- Títulos Barlow Condensed 800 · cuerpo Inter · radios 8–12px

## Créditos de fotografías

Los collages del carrusel principal (`web/public/carousel/*.webp`) se hicieron con fotos bajo licencias Creative Commons (fotocopia, semitono, papel rasgado, cinta y aerosol aplicados con `sharp`). Los collages se publican bajo **CC BY-SA 2.0**.

| Collage | Foto | Autor | Licencia |
|---|---|---|---|
| comunidad | [El Chopo Saturday Market Strollers](https://www.flickr.com/photos/10404073@N05/3338299845) | Carl Campbell | CC BY-SA 2.0 |
| comunidad | [Carestía alimentaria](https://www.flickr.com/photos/99479626@N00/8281241815) | Eneas | CC BY 2.0 |
| intercambio | [Clothes swapping](https://commons.wikimedia.org/w/index.php?curid=15879085) | Neesa Rajbhandari / The S.W.A.P. Team | CC BY-SA 2.0 |
| intercambio | [Combing through the clothing swap](https://www.flickr.com/photos/82439748@N00/5820380362) | blmurch | CC BY 2.0 |
| publica | [Garage Sale In Monroe](https://www.flickr.com/photos/32575263@N00/2559363502) | John Beagle | CC BY 2.0 |
| publica | [clothes swap](https://www.flickr.com/photos/63514728@N00/6081642653) | di bo di | CC BY 2.0 |
| oficio | [Plumber at work](https://commons.wikimedia.org/w/index.php?curid=1613365) | rick (Flickr) | CC BY 2.0 |

Cada diapositiva muestra su crédito en la esquina del collage.
