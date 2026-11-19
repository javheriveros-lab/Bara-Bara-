import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { colors, glow } from '../src/theme';

export default function Home() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Bara Bara' }} />
      <View style={[glow.card, styles.card]}>
        <Text style={styles.kind}>CHAMBA</Text>
        <Text style={styles.title}>BIENVENIDO AL BARRIO</Text>
        <Text style={styles.body}>La app móvil consume la misma API que la web.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16, justifyContent: 'center' },
  card: { padding: 20, gap: 8 },
  kind: { color: colors.violet, fontWeight: '700', letterSpacing: 1.2, fontSize: 12 },
  title: { color: colors.text, fontWeight: '900', fontSize: 24 },
  body: { color: colors.textMuted, fontSize: 15 },
});
