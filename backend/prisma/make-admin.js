// Da (o quita) el rol ADMIN a un vecino existente. Los admins revisan verificaciones y comprobantes en /admin.
//   npx pnpm@9.15.0 --filter backend make-admin tu@correo.mx
//   npx pnpm@9.15.0 --filter backend make-admin tu@correo.mx --revoke

const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const loadEnv = require('./load-env');

loadEnv(path.join(__dirname, '..', '.env'));
const prisma = new PrismaClient();

(async () => {
  const email = process.argv.slice(2).find((a) => !a.startsWith('--'))?.trim().toLowerCase();
  if (!email) throw new Error('Uso: make-admin <email> [--revoke]');
  const role = process.argv.includes('--revoke') ? 'USER' : 'ADMIN';

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`No existe un vecino con el email ${email}`);
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  console.log(role === 'ADMIN' ? `⚡ ${email} ahora es admin` : `${email} ya no es admin`);
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
