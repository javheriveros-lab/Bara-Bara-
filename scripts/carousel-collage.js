// Collages fanzine punk para el carrusel de Bara Bara (fotos CC de Flickr/Wikimedia en cc-photos/).
// Capas: papel periódico con fibra · bloque de color serigráfico desfasado · foto principal en
// fotocopia (alto contraste + grano + semitono) con bordes rasgados · recorte secundario a color de
// tinta · cinta adhesiva · trazos de aerosol/marcador · círculos de semitono estilo cómic.
const sharp = require('C:/Users/Windows 11/Downloads/Bara Bara/node_modules/sharp');
const path = require('node:path');
const SRC = path.join(__dirname, 'cc-photos');
const OUT = 'C:/Users/Windows 11/Downloads/Bara Bara/web/public/carousel/';
require('node:fs').mkdirSync(OUT, { recursive: true });

const W = 720, H = 560;
const INK = '#1a0b3d', VIOLET = '#7c4dff', RED = '#ff1744', YELLOW = '#fdd835', MAGENTA = '#e0005e';

// PRNG determinista para que los rasgados no cambien entre corridas.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/** Contorno de papel rasgado: caminata aleatoria suave con dientes finos (no una sierra regular). */
function tornPath(w, h, seed, amp = 7, step = 5) {
  const r = rng(seed); const pts = [];
  let d = amp * 0.5;
  const walk = () => { d += (r() - 0.5) * amp * 0.55; d = Math.min(amp, Math.max(0, d)); return d + (r() < 0.12 ? r() * amp * 0.8 : 0); };
  for (let x = 0; x <= w; x += step) pts.push([x, walk()]);
  for (let y = 0; y <= h; y += step) pts.push([w - walk(), y]);
  for (let x = w; x >= 0; x -= step) pts.push([x, h - walk()]);
  for (let y = h; y >= 0; y -= step) pts.push([walk(), y]);
  return 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L') + 'Z';
}

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

/** Papel periódico: crema con fibra y manchas (feTurbulence). */
function paper() {
  return svg(W, H, `
    <filter id="f"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.93  0 0 0 0 0.9  0 0 0 0 0.84  0 0 0 -0.9 0.95"/></filter>
    <filter id="m"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.4 0 0 0 0.35 -0.1"/></filter>
    <rect width="100%" height="100%" fill="#efe8da"/>
    <rect width="100%" height="100%" filter="url(#f)" opacity="0.55"/>
    <rect width="100%" height="100%" filter="url(#m)"/>`);
}

/** Grano grueso de fotocopia (se mezcla en "overlay"). */
const grain = (w, h, seed) => svg(w, h, `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)"/>`);

/** Trama de semitono (puntos) para multiplicar sobre la foto. */
const halftone = (w, h, cell = 6, r = 1.6, color = '#000', angle = 22) =>
  svg(w, h, `<defs><pattern id="p" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${cell / 2}" cy="${cell / 2}" r="${r}" fill="${color}"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/>`);

/** Foto en fotocopia: gris, contraste fuerte, grano, semitono, entintada en un color y rasgada. */
async function photocopy(file, w, h, { seed, tint, position = 'centre', contrast = [1.35, -40] }) {
  const base = await sharp(path.join(SRC, file))
    .resize(w, h, { fit: 'cover', position })
    .greyscale()
    .normalise()
    .linear(contrast[0], contrast[1])
    .composite([
      { input: grain(w, h, seed), blend: 'overlay' },
      { input: halftone(w, h, 5, 0.85, '#000', 30), blend: 'soft-light' },
    ])
    .toBuffer();
  // Entintado: la tinta reemplaza al negro y el papel queda en el blanco (duotono).
  const toned = await sharp(base)
    .tint(tint)
    .modulate({ saturation: 1.25 })
    .png()
    .toBuffer();
  // Bordes rasgados (máscara) + filo blanco de papel.
  const torn = tornPath(w, h, seed);
  const masked = await sharp(toned)
    .composite([{ input: svg(w, h, `<path d="${torn}" fill="#fff"/>`), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const pad = 10;
  const edge = svg(w + pad * 2, h + pad * 2, `<path transform="translate(${pad - 4} ${pad - 3}) scale(${(w + 8) / w} ${(h + 7) / h})" d="${tornPath(w, h, seed + 1, 8, 5)}" fill="#f7f3ea"/>`);
  return sharp(edge).composite([{ input: masked, left: pad, top: pad }]).png().toBuffer();
}

const rotate = async (buf, deg) => sharp(buf).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

/** Cinta adhesiva semitransparente con extremos dentados. */
const tape = (w, h, color = 'rgba(253,216,53,0.78)') =>
  svg(w, h, `<path d="M0 3 L${w * 0.15} 0 L${w * 0.35} 4 L${w * 0.6} 0 L${w * 0.85} 3 L${w} 0 L${w - 4} ${h / 2} L${w} ${h} L${w * 0.7} ${h - 3} L${w * 0.4} ${h} L${w * 0.1} ${h - 4} L0 ${h} L4 ${h / 2} Z" fill="${color}"/>`);

/** Trazos de aerosol / marcador y círculos de semitono, encima de todo. */
function marks(variant) {
  const spray = `<filter id="s" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence baseFrequency="0.8" numOctaves="2" seed="${variant + 2}"/><feDisplacementMap in="SourceGraphic" scale="9"/><feGaussianBlur stdDeviation="0.6"/></filter>`;
  const dots = (cx, cy, color) => {
    let d = '';
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const r = Math.max(0, 5.2 - Math.hypot(i - 3, j - 3) * 1.4);
      if (r > 0.4) d += `<circle cx="${cx + i * 13}" cy="${cy + j * 13}" r="${r.toFixed(1)}" fill="${color}"/>`;
    }
    return d;
  };
  const sets = [
    `<path d="M40 70 C120 30 200 95 290 52" stroke="${YELLOW}" stroke-width="14" fill="none" stroke-linecap="round" filter="url(#s)"/>
     ${dots(600, 40, RED)}`,
    `<path d="M520 60 q50 -20 110 20 q-40 30 -96 6" stroke="${YELLOW}" stroke-width="11" fill="none" stroke-linecap="round" filter="url(#s)"/>
     ${dots(36, 30, VIOLET)}`,
    `<path d="M600 80 l40 40 m0 -40 l-40 40" stroke="${RED}" stroke-width="10" stroke-linecap="round" filter="url(#s)"/>
     <path d="M560 360 C600 330 650 350 690 320" stroke="${YELLOW}" stroke-width="13" fill="none" stroke-linecap="round" filter="url(#s)"/>
     ${dots(30, 30, MAGENTA)}`,
    `<circle cx="600" cy="110" r="62" stroke="${YELLOW}" stroke-width="9" fill="none" filter="url(#s)"/>
     ${dots(40, 40, RED)}`,
  ];
  return svg(W, H, spray + sets[variant]);
}

/** Bloque serigráfico de color, rasgado, detrás de la foto (desfase de registro). */
const block = (w, h, color, seed) => svg(w, h, `<path d="${tornPath(w, h, seed, 10, 6)}" fill="${color}"/>`);

const SLIDES = [
  { out: 'comunidad', main: ['c1.jpg', { position: 'centre' }], second: ['c3.jpg', { position: 'right', contrast: [1.2, -20] }], block: VIOLET, tintMain: '#24107a', tintSecond: RED },
  { out: 'intercambio', main: ['c4.jpg', { position: 'centre', contrast: [1.25, -25] }], second: ['c5.jpg', { position: 'left', contrast: [1.1, 10] }], block: MAGENTA, tintMain: INK, tintSecond: VIOLET },
  { out: 'publica', main: ['c9.jpg', { position: 'centre', contrast: [1.25, -20] }], second: ['c6.jpg', { position: 'centre', contrast: [1.2, 0] }], block: RED, tintMain: '#24107a', tintSecond: MAGENTA },
  { out: 'oficio', main: ['c10.jpg', { position: 'centre', contrast: [1.3, -25] }], second: null, block: VIOLET, tintMain: INK, tintSecond: RED },
];

(async () => {
  for (const [i, s] of SLIDES.entries()) {
    const layers = [];
    // Bloque de color desfasado detrás de la foto principal.
    layers.push({ input: await rotate(block(480, 320, s.block, 40 + i), -4 + i * 2), left: 168, top: 46 });
    // Foto principal.
    const main = await photocopy(s.main[0], 470, 310, { seed: 10 + i * 7, tint: s.tintMain, ...s.main[1] });
    layers.push({ input: await rotate(main, i % 2 ? 2 : -2), left: 96, top: 24 });
    // Recorte secundario superpuesto.
    if (s.second) {
      const sec = await photocopy(s.second[0], 230, 170, { seed: 90 + i * 11, tint: s.tintSecond, ...s.second[1] });
      layers.push({ input: await rotate(sec, i % 2 ? -6 : 5), left: i % 2 ? 26 : 466, top: 196 });
    }
    // Cintas sujetando la foto.
    layers.push({ input: await rotate(tape(120, 30), -24), left: 70, top: 26 });
    layers.push({ input: await rotate(tape(110, 28, 'rgba(255,255,255,0.7)'), 18), left: 470, top: 30 });
    // Marcas de aerosol / marcador / semitono.
    layers.push({ input: marks(i), left: 0, top: 0 });

    // En sharp el resize ocurre antes del composite: primero se aplana el collage, luego se reduce.
    const flat = await sharp(paper()).composite(layers).png().toBuffer();
    await sharp(flat).webp({ quality: 78, effort: 6 }).toFile(OUT + `${s.out}.webp`);
    await sharp(flat).resize({ width: 400 }).webp({ quality: 76, effort: 6 }).toFile(OUT + `${s.out}-400.webp`);
    const st = require('node:fs').statSync(OUT + `${s.out}.webp`).size;
    console.log('ok', s.out, Math.round(st / 1024) + 'KB');
  }
})();
