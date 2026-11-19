// La regla de moderación vive en dos archivos que deben ser idénticos (el backend compila a
// CommonJS y no puede importar el paquete TS compartido). Falla si se desincronizan.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shared = path.join(root, 'packages/shared/src/moderation.ts');
const backend = path.join(root, 'backend/src/common/moderation/moderation.ts');

if (fs.readFileSync(shared, 'utf8') !== fs.readFileSync(backend, 'utf8')) {
  console.error('✗ moderation.ts difiere entre packages/shared y backend. Copia uno sobre el otro:');
  console.error('  cp packages/shared/src/moderation.ts backend/src/common/moderation/moderation.ts');
  process.exit(1);
}
console.log('✓ Reglas de moderación sincronizadas');
