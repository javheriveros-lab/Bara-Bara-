// Tokens de diseño compartidos (web + mobile). Estética cyberpunk sobria.
export const colors = {
  bg: '#000000',
  bgElevated: '#121212',
  surface: 'rgba(255, 255, 255, 0.04)',
  text: '#EDEDED',
  textMuted: '#9A9A9A',
  /** Acento principal: bordes con glow, iconos activos, destacados. */
  violet: '#BB86FC',
  violetGlow: 'rgba(187, 134, 252, 0.15)',
  violetBorder: 'rgba(187, 134, 252, 0.25)',
  /** Solo para el logotipo (rayo) y CTAs críticos. */
  bolt: '#FDD835',
} as const;

export const radii = {
  sm: 8,
  md: 12,
} as const;
