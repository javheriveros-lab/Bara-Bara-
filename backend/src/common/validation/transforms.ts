import type { TransformFnParams } from 'class-transformer';

export const trim = ({ value }: TransformFnParams) => (typeof value === 'string' ? value.trim() : value);

export const toLowerTrim = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const trimEach = ({ value }: TransformFnParams) =>
  Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value;
