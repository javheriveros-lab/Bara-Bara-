/** Utilidades del autocorrector: normalización y distancia de edición. */

/** Minúsculas y sin acentos ("Electrónica" → "electronica"); la ñ se conserva como n para comparar. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Palabras de 2+ letras (letras y números), en su forma original. */
export function words(s: string): string[] {
  return s.match(/[\p{L}\p{N}]{2,}/gu) ?? [];
}

/**
 * Distancia Damerau-Levenshtein (versión "optimal string alignment"): inserciones, borrados,
 * sustituciones y letras invertidas ("tlaadro" → "taladro" cuesta 1). Corta en cuanto supera `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Tolerancia según el largo de la palabra: las cortas casi no admiten errores. */
export function maxTypos(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}
