import { Ionicons } from '@expo/vector-icons';
import { count } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { MOTIVATIONS } from '@/auth/onboarding';
import { Bubbles, MadeBy } from '@/components/Decor';
import { ServerAddress } from '@/components/ServerAddress';
import { db } from '@/db/client';
import { outbox, practiceResults, reviewLogs } from '@/db/schema';
import { getStats } from '@/db/stats';
import type { IconName } from '@/practice/modes';
import { pendingChangeCount, requestSync } from '@/sync/engine';
import { useSyncStatus } from '@/sync/useSync';
import { accents, colors, common, type Accent } from '@/ui/styles';

// The account page: who is signed in, their numbers, sync state and sign-out.
export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const syncStatus = useSyncStatus();

  useLiveQuery(db.select({ total: count() }).from(reviewLogs));
  useLiveQuery(db.select({ total: count() }).from(practiceResults));
  const { data: outboxRows } = useLiveQuery(db.select({ total: count() }).from(outbox));
  const pending = outboxRows[0]?.total ?? 0;

  const stats = getStats();
  const username = session?.username ?? '';
  const motivation = MOTIVATIONS.find((item) => item.id === session?.motivation);

  const syncText =
    syncStatus.state === 'syncing'
      ? 'Senkronize ediliyor…'
      : syncStatus.state === 'offline'
        ? 'Çevrimdışı; bağlantı gelince gönderilecek'
        : syncStatus.state === 'error'
          ? 'Son deneme başarısız; tekrar denenecek'
          : syncStatus.lastSyncedAt
            ? `Son senkronizasyon ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
            : 'Henüz senkronize edilmedi';

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
    <ScrollView style={common.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Bubbles />
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>@{username}</Text>
        <Text style={styles.exam}>
          YDS hazırlık{motivation ? ` · ${motivation.label}` : ''} · günde {session?.dailyGoal ?? 20} kelime
        </Text>
      </View>

      <View style={styles.stats}>
        <StatCard accent="rose" icon="school" value={stats.learned} label="öğrenilen kelime" />
        <StatCard accent="coral" icon="flame" value={stats.streak} label="gün seri" />
        <StatCard accent="plum" icon="trophy" value={stats.testsTaken} label="çözülen test" />
        <StatCard accent="dusty" icon="repeat" value={stats.due} label="tekrar bekleyen" />
      </View>

      <Text style={common.sectionTitle}>Senkronizasyon</Text>
      <View style={[common.card, styles.syncCard]}>
        <Ionicons
          name={syncStatus.state === 'offline' ? 'cloud-offline' : 'cloud-done'}
          size={28}
          color={syncStatus.state === 'idle' ? colors.success : colors.muted}
        />
        <View style={styles.syncText}>
          <Text style={common.rowTitle}>{pending === 0 ? 'Her şey güncel' : `${pending} değişiklik bekliyor`}</Text>
          <Text style={common.rowSubtitle}>{syncText}</Text>
        </View>
        <Pressable onPress={() => void requestSync()} hitSlop={10} accessibilityLabel="Şimdi senkronize et">
          <Ionicons name="sync" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.server}>
        <ServerAddress />
      </View>

      <View style={common.footer}>
        <Pressable style={[common.outlineButton, styles.signOut]} onPress={confirmSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          <Text style={common.outlineButtonText}>Çıkış yap</Text>
        </Pressable>
      </View>

      <MadeBy />
    </ScrollView>
  );
}

function StatCard({ accent, icon, value, label }: { accent: Accent; icon: IconName; value: number; label: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: accents[accent].soft }]}>
      <Ionicons name={icon} size={22} color={accents[accent].main} />
      <Text style={[styles.statValue, { color: accents[accent].main }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  header: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: { fontSize: 38, fontWeight: '800', color: colors.primary },
  username: { color: colors.onPrimary, fontSize: 19, fontWeight: '800' },
  exam: { color: colors.onPrimary, fontSize: 14, opacity: 0.9, marginTop: 4, textAlign: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { width: '47%', flexGrow: 1, borderRadius: 18, padding: 16 },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
  syncCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  syncText: { flex: 1 },
  signOut: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  server: { marginHorizontal: 16 },
});
