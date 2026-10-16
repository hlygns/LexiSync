import { Ionicons } from '@expo/vector-icons';
import { asc, count, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { cards, decks, quizResults } from '@/db/schema';
import { getUnits } from '@/db/units';
import type { IconName } from '@/practice/modes';
import { accents, colors, common, type Accent } from '@/ui/styles';

// Decks are coloured in turn, so each word group is recognisable at a glance.
const LOOKS: { accent: Accent; icon: IconName }[] = [
  { accent: 'rose', icon: 'flash' },
  { accent: 'plum', icon: 'color-palette' },
  { accent: 'coral', icon: 'cube' },
  { accent: 'berry', icon: 'git-merge' },
  { accent: 'mauve', icon: 'bookmark' },
];

// "Kelime Öğren": the word groups (decks), each split into units.
export default function WordsScreen() {
  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(asc(decks.id)));
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(quizResults));

  return (
    <FlatList
      style={common.screen}
      contentContainerStyle={styles.list}
      data={deckRows}
      keyExtractor={(deck) => deck.id}
      ListHeaderComponent={<Text style={styles.intro}>Bir grup seç. Her grup 20 kelimelik ünitelere ayrılır.</Text>}
      ListEmptyComponent={<Text style={common.empty}>Kelimeler yükleniyor. Birkaç saniye içinde burada görünecek.</Text>}
      renderItem={({ item, index }) => {
        const look = LOOKS[index % LOOKS.length];
        const units = getUnits(item.id);
        const passed = units.filter((unit) => unit.status === 'passed').length;
        const words = units.reduce((total, unit) => total + unit.cards.length, 0);
        const progress = units.length === 0 ? 0 : passed / units.length;

        return (
          <Pressable style={common.card} onPress={() => router.push({ pathname: '/deck/[id]', params: { id: item.id } })}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: accents[look.accent].soft }]}>
                <Ionicons name={look.icon} size={24} color={accents[look.accent].main} />
              </View>
              <View style={styles.text}>
                <Text style={common.rowTitle}>{item.name}</Text>
                <Text style={common.rowSubtitle}>
                  {words} kelime · {passed}/{units.length} ünite
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.pink} />
            </View>
            <View style={[common.progressTrack, styles.progress, { backgroundColor: accents[look.accent].soft }]}>
              <View
                style={[common.progressFill, { width: `${progress * 100}%`, backgroundColor: accents[look.accent].main }]}
              />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 16, paddingBottom: 24 },
  intro: { fontSize: 15, color: colors.muted, marginHorizontal: 16, marginBottom: 16, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  progress: { marginTop: 14 },
});
