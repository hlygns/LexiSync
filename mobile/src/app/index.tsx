import { count, desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { db } from '@/db/client';
import { useExams } from '@/db/exams';
import { cards, decks, outbox } from '@/db/schema';
import { getStats, type Stats } from '@/db/stats';
import { addStarterDecks } from '@/starter/starterDecks';
import { pendingChangeCount, requestSync, type SyncStatus } from '@/sync/engine';
import { useSyncStatus } from '@/sync/useSync';
import { colors, common } from '@/ui/styles';

function syncLabel(status: SyncStatus, pending: number): string {
  const waiting = pending > 0 ? ` · ${pending} değişiklik bekliyor` : '';
  switch (status.state) {
    case 'syncing':
      return 'Senkronize ediliyor…';
    case 'offline':
      return `Çevrimdışı — değişiklikler cihazda saklanıyor${waiting}`;
    case 'error':
      return `Senkronizasyon başarısız, tekrar denenecek${waiting}`;
    case 'idle':
      if (pending > 0) return `${pending} değişiklik gönderilmeyi bekliyor`;
      if (!status.lastSyncedAt) return 'Henüz senkronize edilmedi';
      return `Senkronize · ${new Date(status.lastSyncedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

export default function DecksScreen() {
  const { signOut } = useAuth();
  const exams = useExams();
  const syncStatus = useSyncStatus();

  // Live queries: the list re-renders by itself whenever the table changes, including after a pull.
  const { data: deckRows } = useLiveQuery(
    db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(desc(decks.id)),
  );
  const { data: cardCounts } = useLiveQuery(
    db
      .select({ deckId: cards.deckId, total: count() })
      .from(cards)
      .where(isNull(cards.deletedAt))
      .groupBy(cards.deckId),
  );
  const { data: outboxRows } = useLiveQuery(db.select({ total: count() }).from(outbox));
  const pending = outboxRows[0]?.total ?? 0;
  const countByDeck = new Map(cardCounts.map((row) => [row.deckId, row.total]));

  // Recomputed when the screen comes into view (after studying) and when a sync brings new data.
  const [stats, setStats] = useState<Stats>({ reviewedToday: 0, due: 0, streak: 0 });
  useFocusEffect(
    useCallback(() => {
      setStats(getStats());
    }, [syncStatus.lastSyncedAt, cardCounts]),
  );

  async function confirmSignOut() {
    // Give unsent changes one last chance to reach the server.
    await requestSync();
    const unsent = pendingChangeCount();
    if (unsent === 0) {
      await signOut();
      return;
    }
    Alert.alert(
      'Gönderilmemiş değişiklikler var',
      `${unsent} değişiklik henüz sunucuya ulaşmadı. Şimdi çıkış yaparsan bu değişiklikler kaybolur.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yine de çık', style: 'destructive', onPress: () => void signOut() },
      ],
    );
  }

  return (
    <View style={common.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirmSignOut} hitSlop={12}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Çıkış</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.stats}>
        <StatTile value={stats.reviewedToday} label="Bugün çalışılan" />
        <StatTile value={stats.due} label="Bekleyen" />
        <StatTile value={stats.streak} label="Gün seri" />
      </View>

      <Pressable onPress={() => void requestSync()}>
        <Text style={styles.syncStatus}>{syncLabel(syncStatus, pending)}</Text>
      </Pressable>

      <FlatList
        data={deckRows}
        keyExtractor={(deck) => deck.id}
        ListEmptyComponent={
          <View>
            <Text style={common.empty}>Henüz desten yok. Kendi desteni oluştur ya da örnek destelerle başla.</Text>
            <Pressable onPress={addStarterDecks}>
              <Text style={styles.starterLink}>Örnek YDS ve YÖKDİL destelerini ekle</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={common.row}
            onPress={() => router.push({ pathname: '/deck/[id]', params: { id: item.id } })}
          >
            <Text style={common.rowTitle}>{item.name}</Text>
            <Text style={common.rowSubtitle}>
              {exams.find((exam) => exam.id === item.examId)?.name ?? ''} · {countByDeck.get(item.id) ?? 0} kart
            </Text>
          </Pressable>
        )}
      />

      <View style={common.footer}>
        <Pressable style={common.button} onPress={() => router.push('/deck/new')}>
          <Text style={common.buttonText}>Yeni deste</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  tile: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tileValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  tileLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  syncStatus: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 10 },
  starterLink: { color: colors.primary, fontSize: 16, textAlign: 'center', marginTop: 20 },
});
