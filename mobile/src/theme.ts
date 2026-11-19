import { StyleSheet } from 'react-native';
import { colors, radii } from '@bara/shared';

export { colors, radii };

/** Glow violeta aproximado en nativo (iOS: shadow; Android: elevation no admite color de sombra). */
export const glow = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.violetBorder,
    shadowColor: colors.violet,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
