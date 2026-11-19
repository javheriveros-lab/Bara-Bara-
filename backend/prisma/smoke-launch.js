// Prueba de humo del lanzamiento contra una API corriendo (local, por defecto http://localhost:4000/api).
//   npx pnpm@9.15.0 --filter backend smoke
//   API=https://api.tu-dominio.mx/api npx pnpm@9.15.0 --filter backend smoke   (cuidado: escribe en esa base)
//
// Crea cuentas @barabara.test, las usa y al final las borra con todo lo que crearon.
// Usa Prisma directo solo para lo que la API no expone: dar rol admin y fabricar un token de
// restablecimiento (el real llega por correo).

const crypto = require('node:crypto');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const loadEnv = require('./load-env');

loadEnv(path.join(__dirname, '..', '.env'));
const API = (process.env.API ?? `http://localhost:${process.env.PORT ?? 4000}/api`).replace(/\/$/, '');
const prisma = new PrismaClient();
const run = Date.now().toString(36);
const PASS = 'Prueba1234';
let failures = 0;

async function call(method, url, { token, body } = {}) {
  const res = await fetch(API + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(name, cond, extra) {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${extra === undefined ? '' : ` → ${JSON.stringify(extra).slice(0, 200)}`}`);
  }
}

async function register(tag, acceptTerms = true) {
  const email = `smoke-${tag}-${run}@barabara.test`;
  const r = await call('POST', '/auth/register', {
    body: { displayName: `Prueba ${tag}`, email, password: PASS, neighborhood: 'Centro', acceptTerms },
  });
  return { ...r, email, token: r.data?.accessToken };
}

const listingBody = (title) => ({
  type: 'SALE',
  title,
  description: 'Publicación de prueba automática del lanzamiento.',
  category: 'Herramientas',
  condition: 'GOOD',
  neighborhood: 'Centro',
  price: 150,
  images: [],
});

(async () => {
  console.log(`API: ${API}\n`);

  console.log('Registro y términos');
  const noTerms = await register('noterms', false);
  check('sin aceptar términos → 400', noTerms.status === 400, noTerms.data);
  const owner = await register('owner');
  const other = await register('other');
  const admin = await register('admin');
  check('registro aceptando términos → 201', owner.status === 201 && owner.token, owner.data);
  const ownerRow = await prisma.user.findUnique({ where: { email: owner.email } });
  check('se guarda fecha y versión de términos', ownerRow?.acceptedTermsAt && ownerRow?.termsVersion, ownerRow?.termsVersion);

  console.log('Perfil');
  const patched = await call('PATCH', '/users/me', { token: owner.token, body: { displayName: 'Prueba Editada' } });
  check('PATCH /users/me cambia el nombre', patched.status === 200 && patched.data?.displayName === 'Prueba Editada', patched.data);
  const badPass = await call('POST', '/users/me/password', {
    token: owner.token,
    body: { currentPassword: 'incorrecta1', newPassword: 'OtraClave123' },
  });
  check('cambiar contraseña con la actual incorrecta → 401', badPass.status === 401, badPass.data);

  console.log('Recuperar contraseña');
  const forgotUnknown = await call('POST', '/auth/forgot', { body: { email: `nadie-${run}@barabara.test` } });
  check('forgot con correo inexistente → 200 (no revela)', forgotUnknown.status === 200, forgotUnknown.data);
  const forgot = await call('POST', '/auth/forgot', { body: { email: owner.email } });
  check('forgot con correo real → 200', forgot.status === 200, forgot.data);
  // El token real viaja por correo: aquí se fabrica uno equivalente.
  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordReset.create({
    data: {
      userId: ownerRow.id,
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
  const reset = await call('POST', '/auth/reset', { body: { token: rawToken, password: 'NuevaClave123' } });
  check('reset con token válido → 200', reset.status === 200, reset.data);
  const reuse = await call('POST', '/auth/reset', { body: { token: rawToken, password: 'OtraClave456' } });
  check('reusar el token → 400', reuse.status === 400, reuse.data);
  const login = await call('POST', '/auth/login', { body: { email: owner.email, password: 'NuevaClave123' } });
  check('entrar con la contraseña nueva', login.status === 200 && login.data?.accessToken, login.data);
  const ownerToken = login.data?.accessToken ?? owner.token;

  console.log('Mis publicaciones');
  const created = await call('POST', '/listings', { token: ownerToken, body: listingBody(`Taladro prueba ${run}`) });
  check('publicar', created.status === 201, created.data);
  const id = created.data?.id;
  const edited = await call('PUT', `/listings/${id}`, { token: ownerToken, body: { ...listingBody('Taladro editado'), price: 120 } });
  check('editar (dueño)', edited.status === 200 && edited.data?.price === 120, edited.data);
  const foreign = await call('PUT', `/listings/${id}`, { token: other.token, body: listingBody('Taladro rojo') });
  check('editar (otro usuario) → 403', foreign.status === 403, foreign.data);
  const typeChange = await call('PUT', `/listings/${id}`, { token: ownerToken, body: { ...listingBody('x'), type: 'BARTER', price: undefined, barterWants: ['algo'] } });
  check('cambiar el tipo → 400', typeChange.status === 400, typeChange.data);
  const paused = await call('POST', `/listings/${id}/status`, { token: ownerToken, body: { status: 'PAUSED' } });
  check('pausar', paused.status === 200 && paused.data?.status === 'PAUSED', paused.data);
  const feed = await call('GET', `/listings?take=50&q=${encodeURIComponent('Taladro editado')}`);
  check('pausada no sale en el feed', feed.status === 200 && !feed.data.some((l) => l.id === id), feed.status);
  const chatPaused = await call('POST', '/conversations', { token: other.token, body: { listingId: id } });
  check('no se puede abrir chat sobre una pausada → 404', chatPaused.status === 404, chatPaused.data);
  const mine = await call('GET', '/listings/mine', { token: ownerToken });
  check('aparece en /listings/mine', mine.status === 200 && mine.data.some((l) => l.id === id), mine.status);
  await call('POST', `/listings/${id}/status`, { token: ownerToken, body: { status: 'ACTIVE' } });
  const removed = await call('DELETE', `/listings/${id}`, { token: ownerToken });
  check('borrar', removed.status === 200, removed.data);
  const gone = await call('GET', `/listings/${id}`);
  check('borrada → 404 en el detalle', gone.status === 404, gone.status);

  console.log('Reportes y moderación');
  await prisma.user.update({ where: { email: admin.email }, data: { role: 'ADMIN' } });
  const target = await call('POST', '/listings', { token: ownerToken, body: listingBody(`Sospechoso ${run}`) });
  const tid = target.data?.id;
  const selfReport = await call('POST', '/reports', { token: ownerToken, body: { listingId: tid, reason: 'SCAM' } });
  check('reportar lo propio → 400', selfReport.status === 400, selfReport.data);
  const report = await call('POST', '/reports', { token: other.token, body: { listingId: tid, reason: 'SCAM', note: 'Pide depósito por adelantado' } });
  check('reportar → 201', report.status === 201, report.data);
  const dup = await call('POST', '/reports', { token: other.token, body: { listingId: tid, reason: 'SCAM' } });
  check('reporte duplicado → 409', dup.status === 409, dup.data);
  const notAdmin = await call('GET', '/admin/reports', { token: other.token });
  check('/admin/reports sin ser admin → 403', notAdmin.status === 403, notAdmin.status);
  const queue = await call('GET', '/admin/reports', { token: admin.token });
  const row = queue.data?.find?.((r) => r.listing?.id === tid);
  check('el admin ve el reporte', queue.status === 200 && row, queue.status);
  const action = await call('POST', `/admin/reports/${row?.id}/remove`, { token: admin.token });
  check('quitar la publicación', action.status === 200, action.data);
  const afterRemove = await call('GET', `/listings/${tid}`);
  check('publicación quitada → 404', afterRemove.status === 404, afterRemove.status);

  const visible = await call('POST', '/listings', { token: ownerToken, body: listingBody(`Visible ${run}`) });
  const suspend = await call('POST', `/admin/users/${ownerRow.id}/suspend`, { token: admin.token, body: { note: 'Prueba de suspensión' } });
  check('suspender cuenta', suspend.status === 200, suspend.data);
  const blockedLogin = await call('POST', '/auth/login', { body: { email: owner.email, password: 'NuevaClave123' } });
  check('cuenta suspendida no puede entrar → 403', blockedLogin.status === 403, blockedLogin.data);
  const blockedToken = await call('GET', '/users/me', { token: ownerToken });
  check('su token deja de servir → 403', blockedToken.status === 403, blockedToken.status);
  const hidden = await call('GET', `/listings/${visible.data?.id}`);
  check('sus publicaciones se ocultan', hidden.status === 404, hidden.status);
  const unsuspend = await call('POST', `/admin/users/${ownerRow.id}/unsuspend`, { token: admin.token });
  check('quitar suspensión', unsuspend.status === 200, unsuspend.data);

  console.log('Seguridad');
  const health = await fetch(`${API}/health`);
  check('health responde', health.ok, health.status);
  check('helmet: X-Content-Type-Options', health.headers.get('x-content-type-options') === 'nosniff');
})()
  .catch((e) => {
    failures++;
    console.error('\nError inesperado:', e.message);
  })
  .finally(async () => {
    // Limpieza: cuentas de esta corrida y todo lo que crearon.
    const users = await prisma.user.findMany({ where: { email: { endsWith: `${run}@barabara.test` } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await prisma.report.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { reportedUserId: { in: ids } }] } });
      await prisma.passwordReset.deleteMany({ where: { userId: { in: ids } } });
      await prisma.listing.deleteMany({ where: { ownerId: { in: ids } } });
      await prisma.service.deleteMany({ where: { providerId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
    console.log(`\n${failures ? `✗ ${failures} fallas` : '✓ Todo pasó'} · limpiadas ${ids.length} cuentas de prueba`);
    process.exitCode = failures ? 1 : 0;
  });
