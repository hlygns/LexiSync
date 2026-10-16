import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// The app logo: a glossy pink tile with a book and a few sparkles around it.
export function ShinyLogo({ size = 120 }: { size?: number }) {
  const radius = size * 0.32;
  return (
    <View style={{ width: size * 1.5, height: size * 1.3, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient
        colors={['#FFD6E2', '#F39BB6', '#E0577F', '#C2415B']}
        locations={[0, 0.35, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, { width: size, height: size, borderRadius: radius }]}
      >
        {/* The gloss: a pale band across the upper half. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gloss, { height: size * 0.5, borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
        />
        <Ionicons name="book" size={size * 0.46} color="#FFFFFF" />
      </LinearGradient>

      {/* Sparkles ("simli") around the tile. */}
      <Ionicons name="sparkles" size={size * 0.24} color="#F39BB6" style={[styles.sparkle, { top: 0, right: size * 0.08 }]} />
      <Ionicons name="sparkles" size={size * 0.16} color="#E0577F" style={[styles.sparkle, { bottom: size * 0.06, left: size * 0.06 }]} />
      <Ionicons name="star" size={size * 0.11} color="#FFC2D4" style={[styles.sparkle, { top: size * 0.22, left: 0 }]} />
      <Ionicons name="star" size={size * 0.09} color="#F39BB6" style={[styles.sparkle, { bottom: size * 0.2, right: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#C2415B',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0 },
  sparkle: { position: 'absolute' },
});
