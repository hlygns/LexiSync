import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/styles';

type Props = { score: number; total: number; good: boolean; title: string; message: string };

// The top of every result screen: a coloured ring with the score, a title and a short message.
export function ResultHeader({ score, total, good, title, message }: Props) {
  const tone = good ? colors.success : colors.primary;
  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: tone }]}>
        <Text style={[styles.score, { color: tone }]}>{score}</Text>
        <Text style={styles.total}>/ {total}</Text>
      </View>
      <View style={styles.titleRow}>
        <Ionicons name={good ? 'checkmark-circle' : 'refresh-circle'} size={24} color={tone} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  score: { fontSize: 48, fontWeight: '800', lineHeight: 52 },
  total: { fontSize: 16, color: colors.muted, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  message: { fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 8 },
});
