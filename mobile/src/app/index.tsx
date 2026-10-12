import { count, desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { db } from '@/db/client';
import { cards, decks, outbox, quizResults, reviewLogs } from '@/db/schema';
import { getStats } from '@/db/stats';
import { getUnits } from '@/db/units';
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
  const syncStatus = useSyncStatus();

  // Live queries: the screen re-renders by itself whenever one of these tables changes,
  // including after a pull. Everything below is then recomputed from the local database.
  const { data: deckRows } = useLiveQuery(
    db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(desc(decks.id)),
  );
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(reviewLogs));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  const { data: outboxRows } = useLiveQuery(db.select({ total: count() }).from(outbox));
  const pending = outboxRows[0]?.total ?? 0;

  const stats = getStats();

  function loadStarterDecks() {
    const { added, updated } = addStarterDecks();
    Alert.alert(
      'Hazır YDS kelimeleri',
      added + updated === 0
        ? 'Destelerin zaten güncel.'
        : `${added} yeni kelime eklendi, ${updated} kelimeye örnek cümle eklendi.`,
    );
  }

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
              <Text style={styles.headerAction}>Çıkış</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={deckRows}
        keyExtractor={(deck) => deck.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.stats}>
              <StatTile value={stats.reviewedToday} label="Bugün çalışılan" />
              <StatTile value={stats.due} label="Tekrar bekleyen" />
              <StatTile value={stats.streak} label="Gün seri" />
            </View>
            <Pressable onPress={() => void requestSync()}>
              <Text style={styles.syncStatus}>{syncLabel(syncStatus, pending)}</Text>
            </Pressable>
            <Text style={common.sectionTitle}>Destelerim</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={common.empty}>
            Henüz desten yok. Aşağıdan hazır YDS kelimelerini ekle ya da + ile kendi desteni oluştur.
          </Text>
        }
        ListFooterComponent={
          <Pressable onPress={loadStarterDecks}>
            <Text style={styles.starterLink}>Hazır YDS kelimelerini ekle / güncelle</Text>
          </Pressable>
        }
        renderItem={({ item }) => <DeckCard id={item.id} name={item.name} />}
      />

      {/* Floating "+" button: new deck. */}
      <Pressable style={styles.fab} onPress={() => router.push('/deck/new')} accessibilityLabel="Yeni deste">
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

function DeckCard({ id, name }: { id: string; name: string }) {
  const units = getUnits(id);
  const passed = units.filter((unit) => unit.status === 'passed').length;
  const words = units.reduce((total, unit) => total + unit.cards.length, 0);
  const progress = units.length === 0 ? 0 : passed / units.length;

  return (
    <Pressable style={common.card} onPress={() => router.push({ pathname: '/deck/[id]', params: { id } })}>
      <Text style={common.rowTitle}>{name}</Text>
      <Text style={common.rowSubtitle}>
        {words} kelime · {passed}/{units.length} ünite tamamlandı
      </Text>
      <View style={[common.progressTrack, styles.deckProgress]}>
        <View style={[common.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
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
  headerAction: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  list: { paddingBottom: 96 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  tile: { flex: 1, backgroundColor: colors.pinkSoft, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  tileValue: { fontSize: 26, fontWeight: '800', color: colors.primary },
  tileLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  syncStatus: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
  deckProgress: { marginTop: 12 },
  starterLink: { color: colors.primary, fontSize: 15, fontWeight: '600', textAlign: 'center', padding: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabPlus: { color: colors.onPrimary, fontSize: 32, lineHeight: 34, fontWeight: '400' },
});
