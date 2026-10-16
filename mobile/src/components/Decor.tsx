import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/styles';

// Translucent circles drawn in the corners of a coloured card. Purely decorative.
// The parent needs overflow: 'hidden' so the circles are cut off at its rounded edge.
export function Bubbles({ tint = '#FFFFFF' }: { tint?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.bubble, styles.bubbleLarge, { backgroundColor: tint }]} />
      <View style={[styles.bubble, styles.bubbleMedium, { backgroundColor: tint }]} />
      <View style={[styles.bubble, styles.bubbleSmall, { backgroundColor: tint }]} />
    </View>
  );
}

// The signature at the bottom of the main screens.
export function MadeBy() {
  return (
    <View style={styles.madeBy}>
      <Text style={styles.madeByText}>Made By Hülya ❤️</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', opacity: 0.14 },
  bubbleLarge: { width: 130, height: 130, borderRadius: 65, top: -45, right: -35 },
  bubbleMedium: { width: 70, height: 70, borderRadius: 35, bottom: -25, right: 40 },
  bubbleSmall: { width: 36, height: 36, borderRadius: 18, top: 18, right: 70 },
  madeBy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 20 },
  madeByText: { fontSize: 14, color: colors.primaryDark, fontWeight: '600', letterSpacing: 0.3 },
});
