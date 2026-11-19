import { registerDecorator, type ValidationOptions } from 'class-validator';

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export type WeeklyAvailability = Partial<Record<WeekDay, string[]>>;

const RANGE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_RANGES_PER_DAY = 4;

/** `{ "mon": ["09:00-14:00", "16:00-19:00"], "sat": ["10:00-18:00"] }` */
export function isWeeklyAvailability(value: unknown): value is WeeklyAvailability {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  return Object.entries(value).every(([day, ranges]) => {
    if (!(WEEK_DAYS as readonly string[]).includes(day)) return false;
    if (!Array.isArray(ranges) || ranges.length > MAX_RANGES_PER_DAY) return false;
    return ranges.every((r) => {
      const m = typeof r === 'string' ? RANGE.exec(r) : null;
      return m !== null && Number(m[1]) * 60 + Number(m[2]) < Number(m[3]) * 60 + Number(m[4]);
    });
  });
}

export function IsWeeklyAvailability(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isWeeklyAvailability',
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} debe ser { mon..sun: ["HH:MM-HH:MM"] } con máx. ${MAX_RANGES_PER_DAY} rangos por día`,
        ...options,
      },
      validator: { validate: isWeeklyAvailability },
    });
  };
}
