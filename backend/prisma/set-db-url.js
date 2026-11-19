// Asistente para escribir DATABASE_URL en backend/.env sin editar el archivo a mano.
//   npx pnpm@9.15.0 --filter backend set-db-url
// Pide usuario, contraseña (no se muestra al escribir) y la dirección del cluster de Atlas,
// arma la cadena con /bara_bara, codifica símbolos y prueba la conexión antes de guardar.

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const ENV = path.join(__dirname, '..', '.env');

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

(async () => {
  console.log('\nDatos en cloud.mongodb.com → tu cluster → Connect → Drivers.');
  console.log('La dirección del cluster es lo que va después de la @, por ejemplo: cluster0.ab1cd.mongodb.net\n');

  const user = await ask('Usuario de la base (Database Access): ');
  const pass = await ask('Contraseña de ese usuario: ', { hidden: true });
  let host = await ask('Dirección del cluster: ');
  host = host.replace(/^mongodb(\+srv)?:\/\//, '').replace(/^.*@/, '').replace(/[/?].*$/, '');

  if (!user || !pass || !/^[a-z0-9-]+\.[a-z0-9]+\.mongodb\.net$/i.test(host)) {
    console.error('\nFaltan datos o la dirección no parece de Atlas (debe terminar en .mongodb.net). No se guardó nada.');
    process.exit(1);
  }

  const url = `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/bara_bara?retryWrites=true&w=majority`;

  process.stdout.write('\nProbando la conexión… ');
  process.env.DATABASE_URL = url;
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    console.log('conectó ✓');
  } catch (e) {
    const msg = String(e.message);
    console.log('no conectó ✗');
    if (/auth|bad auth|Authentication/i.test(msg)) console.error('Usuario o contraseña incorrectos.');
    else if (/DNS|no record/i.test(msg)) console.error('Esa dirección de cluster no existe. Cópiala de nuevo desde Atlas.');
    else if (/timed out|Server selection/i.test(msg)) console.error('Atlas no respondió: en Network Access agrega tu IP (o 0.0.0.0/0).');
    else console.error(msg.split('\n').slice(-2).join(' ').replace(/mongodb\+srv:\/\/\S+/g, '<url>'));
    console.error('No se guardó nada.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  let env = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8') : '';
  const line = `DATABASE_URL="${url}"`;
  env = /^DATABASE_URL=.*$/m.test(env) ? env.replace(/^DATABASE_URL=.*$/m, () => line) : `${line}\n${env}`;
  fs.writeFileSync(ENV, env);
  console.log('Guardado en backend/.env ✓  Ya puedes avisar que está listo.\n');
})();
