// Datos de ejemplo para ver el feed con vida.
//   npx pnpm@9.15.0 db:seed         → borra lo demo anterior y vuelve a crearlo
//   npx pnpm@9.15.0 db:seed:clean   → solo borra lo demo
//
// Todo lo demo cuelga de vecinos con email @demo.barabara.mx y contraseña aleatoria
// (nadie puede iniciar sesión con ellos). Nunca toca datos de vecinos reales.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const loadEnv = require('./load-env');

loadEnv(path.join(__dirname, '..', '.env'));
const prisma = new PrismaClient();
const DEMO_DOMAIN = '@demo.barabara.mx';

const minutesAgo = (m) => new Date(Date.now() - m * 60_000);

const USERS = {
  lupita: { displayName: 'Lupita R.', neighborhood: 'Santa María la Ribera', verified: true, score: 4.9, reviews: 23 },
  beto: { displayName: 'Don Beto', neighborhood: 'Iztacalco', verified: true, score: 4.7, reviews: 41 },
  sonidero: { displayName: 'Sonidero K', neighborhood: 'Tepito', verified: false, score: 0, reviews: 0 },
  martin: { displayName: 'Martín P.', neighborhood: 'Doctores', verified: true, score: 5, reviews: 18 },
  caro: { displayName: 'Caro Cocina', neighborhood: 'Portales', verified: true, score: 4.8, reviews: 12 },
  ivan: { displayName: 'Profe Iván', neighborhood: 'Narvarte', verified: false, pending: true, score: 0, reviews: 0 },
};

const LISTINGS = [
  { owner: 'lupita', ago: 12, type: 'SALE', title: 'Bicicleta de ruta rodada 28', category: 'Movilidad', condition: 'GOOD', price: 2800,
    description: 'Cuadro de aluminio, 21 velocidades. Frenos y cadena recién ajustados. Ideal para moverte por la ciudad.' },
  { owner: 'beto', ago: 25, type: 'RENT', title: 'Taladro rotomartillo + brocas', category: 'Herramientas', condition: 'GOOD',
    rentalRate: 120, rentalPeriod: 'DAY', deposit: 300,
    description: 'Taladro de 750 W con juego de brocas para concreto, madera y metal. Te explico cómo usarlo.' },
  { owner: 'sonidero', ago: 40, type: 'BARTER', title: 'Colección de vinilos de cumbia', category: 'Libros y música', condition: 'GOOD',
    barterWants: ['Tornamesa', 'Clases de guitarra'], acceptsServices: true,
    description: 'Más de 30 LPs de cumbia sonidera y tropical de los 80 y 90. Algunos con portada firmada.' },
  { owner: 'beto', ago: 65, type: 'RENT', title: '20 sillas plegables y 3 tablones', category: 'Eventos', condition: 'GOOD',
    rentalRate: 400, rentalPeriod: 'DAY', deposit: 500,
    description: 'Para fiestas, posadas o juntas vecinales. Te las llevo si es en la colonia.' },
  { owner: 'lupita', ago: 90, type: 'SALE', title: 'Licuadora de 10 velocidades', category: 'Hogar', condition: 'LIKE_NEW', price: 450,
    description: 'Vaso de vidrio, casi sin uso. Me regalaron otra y no necesito dos.' },
  { owner: 'caro', ago: 130, type: 'BARTER', title: 'Carriola en buen estado', category: 'Niñez', condition: 'GOOD',
    barterWants: ['Ropa de niño talla 4', 'Silla para auto'],
    description: 'Carriola plegable con toldo y canastilla. Lavada y lista.' },
  { owner: 'sonidero', ago: 180, type: 'RENT', title: 'Bocina con micrófono para fiestas', category: 'Eventos', condition: 'GOOD',
    rentalRate: 350, rentalPeriod: 'DAY', deposit: 800,
    description: 'Bocina de 15" con batería, micrófono inalámbrico y luces. Aguanta toda la noche.' },
  { owner: 'beto', ago: 240, type: 'SALE', title: 'Laptop ThinkPad T480', category: 'Tecnología', condition: 'GOOD', price: 4200,
    description: 'Core i5, 8 GB RAM, SSD de 256 GB. Batería dura unas 4 horas. Ideal para la escuela.' },
  { owner: 'ivan', ago: 300, type: 'BARTER', title: 'Libros de preparatoria', category: 'Libros y música', condition: 'FAIR',
    barterWants: ['Calculadora científica'],
    description: 'Matemáticas, física y química de 1º a 3º. Algunos subrayados.' },
];

const SERVICES = [
  { provider: 'martin', ago: 18, category: 'PLUMBING', title: 'Plomería urgente y fugas', pricingModel: 'FIXED', basePrice: 250,
    coverageRadiusKm: 5, availability: { mon: ['08:00-18:00'], tue: ['08:00-18:00'], wed: ['08:00-18:00'], sat: ['09:00-14:00'] },
    description: 'Reparo fugas, cambio llaves, WC y calentadores. Precio por visita; material aparte.' },
  { provider: 'caro', ago: 55, category: 'COOKING', title: 'Comida corrida semanal', pricingModel: 'FIXED', basePrice: 650,
    coverageRadiusKm: 2, availability: { mon: ['13:00-15:00'], tue: ['13:00-15:00'], wed: ['13:00-15:00'], thu: ['13:00-15:00'], fri: ['13:00-15:00'] },
    description: 'Cinco comidas a la semana: sopa, guisado y agua del día. Te la llevo a tu casa o trabajo.' },
  { provider: 'beto', ago: 110, category: 'ELECTRICAL', title: 'Instalación de contactos y apagadores', pricingModel: 'HOURLY', basePrice: 180,
    coverageRadiusKm: 4, description: 'Contactos, apagadores, lámparas y revisión de corto circuito.' },
  { provider: 'ivan', ago: 200, category: 'CLASSES', title: 'Clases de matemáticas para secundaria', pricingModel: 'HOURLY', basePrice: 150,
    coverageRadiusKm: 3, availability: { tue: ['16:00-20:00'], thu: ['16:00-20:00'] },
    description: 'Regularización y preparación para examen de ingreso a prepa. En tu casa o en línea.' },
  { provider: 'martin', ago: 360, category: 'PLUMBING', title: 'Impermeabilización de azoteas', pricingModel: 'QUOTE',
    coverageRadiusKm: 8, description: 'Voy, mido y te doy presupuesto sin compromiso. Garantía de 3 años.' },
];

async function clean() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: DEMO_DOMAIN } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return { users: 0 };

  const [listings, services] = await Promise.all([
    prisma.listing.findMany({ where: { ownerId: { in: ids } }, select: { id: true } }),
    prisma.service.findMany({ where: { providerId: { in: ids } }, select: { id: true } }),
  ]);
  const participations = await prisma.conversationParticipant.findMany({ where: { userId: { in: ids } }, select: { conversationId: true } });
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { id: { in: participations.map((p) => p.conversationId) } },
        { listingId: { in: listings.map((l) => l.id) } },
        { serviceId: { in: services.map((s) => s.id) } },
      ],
    },
    select: { id: true },
  });
  const convIds = conversations.map((c) => c.id);

  // MongoDB: Prisma emula las cascadas solo en delete(), así que se borra en orden.
  await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
  await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: convIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
  await prisma.review.deleteMany({ where: { OR: [{ authorId: { in: ids } }, { targetUserId: { in: ids } }] } });
  await prisma.verificationDocument.deleteMany({ where: { userId: { in: ids } } });
  const l = await prisma.listing.deleteMany({ where: { ownerId: { in: ids } } });
  const s = await prisma.service.deleteMany({ where: { providerId: { in: ids } } });
  const u = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return { users: u.count, listings: l.count, services: s.count, conversations: convIds.length };
}

async function seed() {
  const ids = {};
  for (const [key, u] of Object.entries(USERS)) {
    const user = await prisma.user.create({
      data: {
        email: `${key}${DEMO_DOMAIN}`,
        passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
        displayName: u.displayName,
        neighborhood: u.neighborhood,
        verificationStatus: u.verified ? 'VERIFIED' : u.pending ? 'PENDING' : 'UNVERIFIED',
        ineVerified: u.verified,
        addressProofVerified: u.verified,
        verifiedAt: u.verified ? minutesAgo(60 * 24 * 30) : null,
        reputationScore: u.score,
        reviewCount: u.reviews,
      },
      select: { id: true },
    });
    ids[key] = user.id;
  }

  for (const { owner, ago, ...l } of LISTINGS) {
    await prisma.listing.create({
      data: {
        ...l,
        ownerId: ids[owner],
        neighborhood: USERS[owner].neighborhood,
        images: [],
        barterWants: l.barterWants ?? [],
        createdAt: minutesAgo(ago),
      },
    });
  }

  for (const { provider, ago, ...s } of SERVICES) {
    await prisma.service.create({
      data: { ...s, providerId: ids[provider], neighborhood: USERS[provider].neighborhood, images: [], createdAt: minutesAgo(ago) },
    });
  }

  return { users: Object.keys(ids).length, listings: LISTINGS.length, services: SERVICES.length };
}

(async () => {
  const removed = await clean();
  console.log(`🧹 Demo anterior borrado: ${JSON.stringify(removed)}`);
  if (process.argv.includes('--clean')) return;
  const created = await seed();
  console.log(`⚡ Demo creado: ${created.users} vecinos, ${created.listings} publicaciones, ${created.services} chambas`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
