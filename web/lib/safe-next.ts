/** Evita open redirects: solo rutas internas ("/algo"), nunca "//dominio", "/\dominio" ni URLs absolutas. */
export function safeNext(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : undefined;
}
