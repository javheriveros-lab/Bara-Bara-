const whole = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

/** "$120" si es entero, "$1,250.50" si trae centavos. */
export const formatMoney = (n: number) => (Number.isInteger(n) ? whole : cents).format(n);

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/** "ahora", "hace 5 min", "hace 3 h", "ayer", "12 sep". */
export function formatRelative(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 60 * 24 && date.getDate() === now.getDate()) return `hace ${Math.floor(minutes / 60)} h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'ayer';
  return shortDate.format(date);
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type Day = (typeof DAYS)[number];
const DAY_LABEL: Record<Day, string> = { mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom' };

/**
 * `{ mon: ["13:00-15:00"], …, fri: ["13:00-15:00"], sat: ["10:00-14:00"] }`
 * → "Lun–Vie 13:00–15:00 · Sáb 10:00–14:00" (agrupa días seguidos con el mismo horario).
 */
export function formatAvailability(a: Partial<Record<Day, string[]>> | null): string | undefined {
  if (!a) return undefined;

  const groups: { from: Day; to: Day; ranges: string }[] = [];
  for (const day of DAYS) {
    const ranges = a[day]?.length ? a[day]!.map((r) => r.replace('-', '–')).join(', ') : '';
    const last = groups.at(-1);
    const prevDay = DAYS[DAYS.indexOf(day) - 1];
    if (ranges && last && last.ranges === ranges && last.to === prevDay) last.to = day;
    else if (ranges) groups.push({ from: day, to: day, ranges });
  }

  if (!groups.length) return undefined;
  return groups
    .map((g) => `${DAY_LABEL[g.from]}${g.from === g.to ? '' : `–${DAY_LABEL[g.to]}`} ${g.ranges}`)
    .join(' · ');
}
