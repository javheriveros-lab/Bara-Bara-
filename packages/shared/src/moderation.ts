// ─────────────────────────────────────────────────────────────────────────────
// Moderación de contenido de Bara Bara.
//
// ESTE ARCHIVO EXISTE EN DOS LUGARES Y DEBE SER IDÉNTICO:
//   packages/shared/src/moderation.ts          → web y mobile (aviso inmediato)
//   backend/src/common/moderation/moderation.ts → API (la regla que manda)
// Verificar: npx pnpm@9.15.0 check:moderation
//
// Cómo funciona: el texto se normaliza (minúsculas, sin acentos, leetspeak y letras
// separadas: "R0B4D0", "r.o.b.a.d.o" → "robado") y se buscan palabras o frases
// completas, no fragmentos: "armario" no activa "arma". Las frases de ALLOWED se quitan
// antes de revisar para no bloquear herramientas como "pistola de silicón".
// ─────────────────────────────────────────────────────────────────────────────

export type ProhibitedCategory = 'STOLEN' | 'WEAPONS' | 'DRUGS' | 'SEXUAL';

/** Mensaje general que ve el vecino. */
export const PROHIBITED_CONTENT_MESSAGE =
  'La publicación contiene términos prohibidos por seguridad y no puede ser procesada.';

/** Código en el cuerpo del 400 de la API para que los clientes lo distingan. */
export const PROHIBITED_CONTENT_CODE = 'PROHIBITED_CONTENT';

/** Motivo por categoría (va junto al campo). Nunca se repite la palabra detectada. */
export const PROHIBITED_REASON: Record<ProhibitedCategory, string> = {
  STOLEN: 'Bara Bara no permite artículos robados, ajenos o de procedencia dudosa.',
  WEAPONS: 'Bara Bara no permite armas, municiones ni explosivos.',
  DRUGS: 'Bara Bara no permite drogas, psicotrópicos ni sustancias controladas.',
  SEXUAL: 'Bara Bara no permite servicios sexuales, de acompañantes ni contenido para adultos.',
};

// Nombres propios frecuentes para detectar "era de Juan", "es de Lupita" (artículo ajeno).
const NAMES =
  'juan|jose|luis|carlos|jorge|miguel|pedro|antonio|francisco|javier|alejandro|fernando|ricardo|roberto|manuel|' +
  'eduardo|daniel|david|mario|sergio|raul|arturo|hector|oscar|rafael|alberto|enrique|ramon|pablo|victor|' +
  'andres|diego|ivan|hugo|armando|alfredo|gerardo|rodrigo|adrian|cesar|ernesto|gabriel|guillermo|ruben|' +
  'memo|pepe|beto|paco|lalo|chucho|nacho|maria|lupita|lupe|juana|margarita|veronica|' +
  'patricia|rosa|elena|leticia|teresa|alejandra|adriana|gabriela|laura|claudia|mariana|daniela|fernanda|sofia|' +
  'ana|andrea|carmen|martha|marta|silvia|monica|diana|karla|paola|yolanda|lucia|sandra|araceli|' +
  'erika|lorena|isabel|susana|brenda|jessica|valeria|ximena|regina|camila|paty|lety';
// Fuera a propósito: nombres que también son palabras ("es de tono azul", "es de norma oficial",
// "es de caro mantenimiento", "la imagen es de Jesús").

const PATTERNS: Record<ProhibitedCategory, string[]> = {
  STOLEN: [
    'robad[oa]s?',
    'hurtad[oa]s?',
    'recien robad[oa]s?',
    'producto de (un )?robo',
    'ajen[oa]s?',
    'sin facturas?',
    'sin papeles',
    'sin comprobante de propiedad',
    '(de )?(dudosa|desconocida) procedencia',
    'procedencia (dudosa|desconocida)',
    'sin procedencia',
    'chuec[oa]s?',
    'imei (reportad[oa]|bloquead[oa]|clonad[oa]|boletinad[oa])',
    '(celular|telefono|equipo|iphone|moto|auto|carro|coche|bici|bicicleta)s? (reportad[oa]|boletinad[oa])s?',
    'con reporte de robo',
    'no (es|son) (mio|mia|mios|mias|nuestr[oa]s?)',
    'de otra persona',
    'de alguien mas',
    'no preguntes? de donde',
    'se (lo|la|los|las) (quite|baje|robe|volamos|vole)',
    'se cayo del camion',
    `(es|era|son|eran|fue) de (${NAMES})`,
    `(pertenece|pertenecia|pertenecen|pertenecian) a (${NAMES})`,
  ],
  WEAPONS: [
    // "arma" suelto no: "se arma en 5 minutos" es de todos los días.
    'armas',
    'vendo (un |una )?arma',
    'arma (de|para) (defensa|proteccion)',
    'armamento',
    'armas? (de fuego|blancas?|de asalto|de guerra|hechizas?)',
    'pistolas?',
    'revolver(es)?',
    'rifles?',
    'escopetas?',
    'fusil(es)?',
    'carabinas?',
    'ametralladoras?',
    'subametralladoras?',
    'metralletas?',
    'cuerno de chivo',
    'ak ?47',
    'ar ?15',
    'glock',
    'beretta',
    'calibre \\d+',
    '\\d+ ?mm (luger|parabellum)',
    'municion(es)?',
    // "bala" suelto no: "esta bici es una bala".
    'balas',
    'bala (calibre|expansiva|de plomo|de goma)',
    'cartuchos? (calibre|de escopeta|de rifle|de pistola|\\d+)',
    'casquillos?',
    'cargadores? (de|para) (pistola|rifle|arma|escopeta)',
    'silenciador(es)? (de|para) (pistola|rifle|arma)',
    'granadas?',
    'explosivos?',
    'dinamita',
    'polvora',
    'detonador(es)?',
    'punal(es)?',
    'dagas?',
    'manoplas?',
    'navajas? (automaticas?|de resorte|de boton|mariposa|balisong|tacticas?)',
    'cuchillos? (tacticos?|de combate|militar(es)?)',
    'bayonetas?',
    'nunchakus?',
    'chacos',
    'shurikens?',
    'estrellas? ninja',
    'ballestas?',
    'tasers?',
  ],
  DRUGS: [
    'drogas?',
    'narcoticos?',
    'estupefacientes?',
    'sustancias? (ilicitas?|controladas?|prohibidas?|ilegales?)',
    'psicotropicos?',
    'marihuana',
    'mariguana',
    'marijuana',
    'can+abis',
    'mota',
    'cogollos?',
    'porros?',
    'thc',
    'hachis',
    'hashish',
    'cocaina',
    'crack',
    'metanfetaminas?',
    'anfetaminas?',
    'meth',
    'heroina',
    'fentanilo',
    'fenta',
    'opio',
    'morfina',
    'codeina',
    'oxicodona',
    'lsd',
    'acido lisergico',
    'tachas',
    'extasis',
    'mdma',
    'molly',
    'hongos? (alucinogenos?|magicos?)',
    'peyote',
    'ayahuasca',
    'dmt',
    'ketamina',
    'ghb',
    'poppers?',
    'clonazepam',
    'rivotril',
    'alprazolam',
    'xanax',
    'tafil',
    'diazepam',
    'valium',
    'flunitrazepam',
    'rohypnol',
    'tramadol',
    'medicamentos? controlados?',
    'recetas? controladas?',
  ],
  SEXUAL: [
    'sexo',
    'sexual(es)?',
    'sexoservidor(a|es|as)?',
    'escorts?',
    'servicios? de acompanantes?',
    'acompanantes? (vip|intim[oa]s?|para adultos|de lujo|sexuales?)',
    'damas? de compania',
    'chicas? (vip|prepago|escort)',
    'prepagos?',
    'masajes? (eroticos?|sensuales?|tantricos?|para adultos|con final feliz)',
    'final feliz',
    'happy ending',
    'erotic[oa]s?',
    'porno',
    'pornografi(a|c[oa]s?)',
    'x{3}',
    'contenido (para )?adultos?',
    'solo para adultos',
    'nudes',
    'fotos? (intimas?|desnud[oa]s?|hot)',
    'packs? (intimos?|hot|x+|de fotos)',
    'vendo packs?',
    'onlyfans',
    'only fans',
    'webcam (erotica|hot|sexual)',
    'videollamadas? (hot|eroticas?|calientes?|intimas?)',
    'sexting',
    'citas? (intimas?|sexuales|casuales)',
    'encuentros? (casuales|intimos?|sexuales)',
    'sugar (daddy|mommy|baby)',
    'servicio (completo|intimo)',
    'fetiches?',
    'bdsm',
    'trata de personas',
    'explotacion sexual',
  ],
};

/** Usos legítimos que contienen una palabra vigilada (herramientas, juguetes, gas doméstico). */
const ALLOWED = [
  'pistolas? (de|para) (silicon|silicona|calor|pintura|pintar|aire|clavos|grapas|agua|juguete|burbujas|temperatura|soldar|impacto|hidrolavadora|gas)',
  'pistolas? (termica|termicas|de hule|nerf)',
  'balas? de (gas|oxigeno|helio)',
  '(rifle|pistola|arma|espada)s? de juguete',
];

// ── Motor ──

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

const compile = (sources: string[]) =>
  new RegExp(`(?:^| )(?:${sources.map((s) => `(?:${s})`).join('|')})(?= |$)`);

const RULES = (Object.keys(PATTERNS) as ProhibitedCategory[]).map((category) => ({
  category,
  regex: compile(PATTERNS[category]),
}));
const ALLOWED_REGEX = new RegExp(`(?:^| )(?:${ALLOWED.map((s) => `(?:${s})`).join('|')})(?= |$)`, 'g');

/** Texto comparable: "¡R0B4D0, sin fáctura!" → "robado sin factura". */
export function normalizeForModeration(text: string, { leet = true }: { leet?: boolean } = {}): string {
  let t = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (leet) {
    // Leetspeak solo pegado a letras: "r0bado" → "robado", pero "calibre 22" y "iPhone 13" no cambian.
    t = t.replace(/[@$]/g, (c) => LEET[c]);
    t = t.replace(/(?<=[a-z])[013457]|[013457](?=[a-z])/g, (c) => LEET[c]);
  }
  // Letras sueltas separadas por puntos, guiones o espacios: "r.o.b.a.d.o" → "robado".
  t = t.replace(/(?<![a-z0-9])(?:[a-z][\s.\-_*·]+){2,}[a-z](?![a-z0-9])/g, (m) => m.replace(/[^a-z]/g, ''));
  return t.replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Primera categoría prohibida que aparece en el texto, o null. */
export function findProhibitedContent(text: string | null | undefined): ProhibitedCategory | null {
  if (!text) return null;
  // Con leetspeak ("r0bado") y sin él ("ak47", "ar15"); cada una también con letras repetidas
  // colapsadas, para estiramientos como "robaaado" o "canabis".
  const variants = new Set<string>();
  for (const leet of [true, false]) {
    const normal = normalizeForModeration(text, { leet });
    variants.add(normal).add(normal.replace(/([a-z])\1+/g, '$1'));
  }
  for (const variant of variants) {
    const cleaned = variant.replace(ALLOWED_REGEX, ' ');
    for (const rule of RULES) if (rule.regex.test(cleaned)) return rule.category;
  }
  return null;
}

/** Revisa varios campos a la vez. Devuelve { campo: categoría } solo de los que fallan. */
export function findProhibitedFields(
  fields: Record<string, string | string[] | null | undefined>,
): Partial<Record<string, ProhibitedCategory>> {
  const out: Partial<Record<string, ProhibitedCategory>> = {};
  for (const [name, value] of Object.entries(fields)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const hit = findProhibitedContent(v);
      if (hit) {
        out[name] = hit;
        break;
      }
    }
  }
  return out;
}

/** Texto que se muestra bajo un campo con contenido prohibido. */
export const prohibitedFieldMessage = (category: ProhibitedCategory) =>
  `Término prohibido. ${PROHIBITED_REASON[category]}`;
