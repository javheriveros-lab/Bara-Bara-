import { Injectable, Logger } from '@nestjs/common';
import { ListingStatus, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { editDistance, fold, maxTypos, words } from './fuzzy';

/** Palabras que la gente busca aunque todavía no haya publicaciones con ellas (categorías y básicos). */
const BASE_VOCABULARY = [
  // Categorías y pilares
  'herramientas', 'tecnología', 'eventos', 'hogar', 'muebles', 'ropa', 'movilidad', 'libros', 'música', 'niñez',
  'deportes', 'otros', 'plomería', 'electricidad', 'belleza', 'cocina', 'clases', 'servicios', 'venta', 'renta',
  'intercambio',
  // Cosas comunes en un mercado de la comunidad
  'taladro', 'bicicleta', 'celular', 'teléfono', 'computadora', 'laptop', 'tablet', 'televisión', 'pantalla',
  'refrigerador', 'lavadora', 'estufa', 'microondas', 'licuadora', 'mesa', 'silla', 'sillas', 'sillón', 'cama',
  'colchón', 'ropero', 'escritorio', 'zapatos', 'tenis', 'chamarra', 'vestido', 'pantalón', 'playera', 'juguetes',
  'carriola', 'cuna', 'bocina', 'audífonos', 'consola', 'videojuegos', 'guitarra', 'teclado', 'cámara', 'moto',
  'coche', 'auto', 'llantas', 'escalera', 'martillo', 'pinzas', 'desarmador', 'cortadora', 'generador', 'carpa',
  'lona', 'manteles', 'vajilla', 'comida', 'pastel', 'uñas', 'corte', 'cabello', 'peinado', 'maquillaje',
  'electricista', 'plomero', 'albañil', 'pintor', 'carpintero', 'herrero', 'jardinero', 'mecánico', 'costura',
  'reparación', 'instalación', 'limpieza', 'mudanza', 'flete', 'regularización', 'inglés', 'matemáticas',
];

type VocabEntry = { original: string; freq: number };

const REFRESH_MS = 10 * 60 * 1000;

/**
 * Autocorrector de la búsqueda. El vocabulario sale de las publicaciones activas (títulos y
 * categorías) más una lista base, y se refresca cada 10 minutos en memoria.
 */
@Injectable()
export class SearchService {
  private readonly log = new Logger(SearchService.name);
  /** clave sin acentos → forma original más frecuente y cuántas veces aparece. */
  private vocab = new Map<string, VocabEntry>();
  private titles: string[] = [];
  private builtAt = 0;
  private building: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureVocabulary() {
    if (Date.now() - this.builtAt < REFRESH_MS && this.vocab.size) return;
    this.building ??= this.build().finally(() => (this.building = null));
    await this.building;
  }

  private async build() {
    try {
      const [listings, services] = await Promise.all([
        this.prisma.listing.findMany({ where: { status: ListingStatus.ACTIVE }, select: { title: true, category: true }, take: 2000 }),
        this.prisma.service.findMany({ where: { status: ServiceStatus.ACTIVE }, select: { title: true }, take: 2000 }),
      ]);
      const vocab = new Map<string, VocabEntry>();
      const add = (w: string, weight: number) => {
        const key = fold(w);
        if (key.length < 3) return;
        const prev = vocab.get(key);
        if (prev) prev.freq += weight;
        else vocab.set(key, { original: w.toLowerCase(), freq: weight });
      };
      for (const w of BASE_VOCABULARY) add(w, 2);
      const titles: string[] = [];
      for (const l of listings) {
        titles.push(l.title);
        for (const w of words(l.title)) add(w, 3);
        for (const w of words(l.category)) add(w, 2);
      }
      for (const s of services) {
        titles.push(s.title);
        for (const w of words(s.title)) add(w, 3);
      }
      this.vocab = vocab;
      this.titles = [...new Set(titles)];
      this.builtAt = Date.now();
    } catch (e) {
      this.log.warn(`No se pudo armar el vocabulario: ${(e as Error).message}`);
    }
  }

  /**
   * Corrige una palabra: si existe pero sin acentos ("plomeria"), regresa su forma con acentos
   * (la búsqueda de la base sí distingue acentos); si no existe, la más parecida dentro de la
   * tolerancia. null si ya está bien escrita o no hay nada parecido.
   */
  private correctWord(word: string): string | null {
    const key = fold(word);
    if (key.length < 3 || /^\d+$/.test(key)) return null;
    const exact = this.vocab.get(key);
    if (exact) return exact.original === word.toLowerCase() ? null : exact.original;
    const max = maxTypos(key.length);
    if (max === 0) return null;
    let best: { entry: VocabEntry; dist: number } | null = null;
    for (const [candidate, entry] of this.vocab) {
      const dist = editDistance(key, candidate, max);
      if (dist > max) continue;
      if (!best || dist < best.dist || (dist === best.dist && entry.freq > best.entry.freq)) best = { entry, dist };
    }
    return best ? best.entry.original : null;
  }

  /**
   * `corrected`: la búsqueda con las palabras mal escritas reemplazadas (null si no hubo cambios).
   * `suggestions`: títulos de publicaciones que coinciden con lo escrito (o con la corrección).
   */
  async suggest(q: string) {
    await this.ensureVocabulary();
    const raw = q.trim().slice(0, 60);
    if (!raw) return { corrected: null, suggestions: [] as string[] };

    let changed = false;
    const corrected = raw.replace(/[\p{L}\p{N}]{2,}/gu, (w) => {
      const fix = this.correctWord(w);
      if (!fix) return w;
      changed = true;
      return fix;
    });

    const needles = [fold(raw), ...(changed ? [fold(corrected)] : [])];
    const suggestions = this.titles
      .filter((t) => {
        const ft = fold(t);
        return needles.some((n) => n.split(/\s+/).every((part) => ft.includes(part)));
      })
      .slice(0, 6);

    return { corrected: changed ? corrected : null, suggestions };
  }
}
