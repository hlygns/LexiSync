import { Ionicons } from '@expo/vector-icons';
import { count, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { MOTIVATIONS } from '@/auth/onboarding';
import { Bubbles, MadeBy } from '@/components/Decor';
import { db } from '@/db/client';
import { cards, decks, outbox, practiceResults, quizResults, reviewLogs } from '@/db/schema';
import { getStats } from '@/db/stats';
import { getUnits } from '@/db/units';
import { MODES, type IconName } from '@/practice/modes';
import { requestSync, type SyncStatus } from '@/sync/engine';
import { useSyncStatus } from '@/sync/useSync';
import { accents, colors, common, type Accent } from '@/ui/styles';

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

// "hulya.yds" -> "Hulya"
function displayName(username: string | undefined): string {
  const name = (username ?? '').split('@')[0].split(/[._+\d-]/)[0];
  return name ? name[0].toLocaleUpperCase('tr-TR') + name.slice(1) : '';
}

// The home screen: a greeting, today's numbers and the study areas to choose from.
export default function HomeScreen() {
  const { session } = useAuth();
  const syncStatus = useSyncStatus();

  // Subscriptions: the screen re-renders whenever one of these tables changes, including after a
  // pull, and everything below is then recomputed from the local database.
  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(isNull(decks.deletedAt)));
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(reviewLogs));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  useLiveQuery(db.select({ total: count() }).from(practiceResults));
  const { data: outboxRows } = useLiveQuery(db.select({ total: count() }).from(outbox));
  const pending = outboxRows[0]?.total ?? 0;

  const stats = getStats();
  const units = deckRows.flatMap((deck) => getUnits(deck.id));
  const unitsPassed = units.filter((unit) => unit.status === 'passed').length;
  const name = displayName(session?.username);
  const dailyGoal = session?.dailyGoal ?? 20;
  const goalProgress = Math.min(stats.reviewedToday / dailyGoal, 1);
  const cheer = MOTIVATIONS.find((item) => item.id === session?.motivation)?.cheer;

  return (
    <View style={common.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')} hitSlop={12} accessibilityLabel="Profil">
              <Ionicons name="person-circle" size={32} color={colors.onPrimary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Bubbles />
          <Text style={styles.hello}>{name ? `Merhaba, ${name}` : 'Merhaba'}</Text>
          <Text style={styles.heroQuestion}>{cheer ?? 'Bugün ne çalışmak istersin?'}</Text>

          <View style={styles.goal}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Bugünkü hedef</Text>
              <Text style={styles.goalValue}>
                {Math.min(stats.reviewedToday, dailyGoal)} / {dailyGoal} kelime{goalProgress >= 1 ? ' ✓' : ''}
              </Text>
            </View>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${goalProgress * 100}%` }]} />
            </View>
          </View>
          <View style={styles.heroStats}>
            <HeroStat icon="flame" value={stats.streak} label="gün seri" />
            <HeroStat icon="today" value={stats.reviewedToday} label="bugün" />
            <HeroStat icon="school" value={stats.learned} label="öğrenilen" />
          </View>
        </View>

        <Pressable onPress={() => void requestSync()}>
          <Text style={styles.syncStatus}>{syncLabel(syncStatus, pending)}</Text>
        </Pressable>

        <Text style={common.sectionTitle}>Çalışma alanları</Text>
        <View style={styles.grid}>
          <Tile
            accent="rose"
            icon="book"
            title="Kelime Öğren"
            subtitle={units.length === 0 ? 'Kelimeler yükleniyor…' : `${unitsPassed}/${units.length} ünite tamamlandı`}
            href="/words"
          />
          <Tile
            accent="dusty"
            icon="repeat"
            title="Tekrar"
            subtitle={stats.due === 0 ? 'Bugün bekleyen yok' : `${stats.due} kelime bekliyor`}
            href="/review"
            badge={stats.due}
          />
          {(['cloze', 'translation', 'vocab', 'general'] as const).map((mode) => (
            <Tile
              key={mode}
              accent={MODES[mode].accent}
              icon={MODES[mode].icon}
              title={MODES[mode].title}
              subtitle={MODES[mode].description}
              href={{ pathname: '/practice/[mode]', params: { mode } }}
            />
          ))}
        </View>

        <Pressable style={[common.card, styles.progressCard]} onPress={() => router.push('/progress')}>
          <View style={[styles.progressIcon, { backgroundColor: accents.mauve.soft }]}>
            <Ionicons name="stats-chart" size={24} color={accents.mauve.main} />
          </View>
          <View style={styles.progressText}>
            <Text style={common.rowTitle}>Gelişimim</Text>
            <Text style={common.rowSubtitle}>
              {stats.testsTaken === 0 ? 'İlk testini çöz, sonuçların burada birikir' : `${stats.testsTaken} test çözdün · sonuçlarını gör`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.pink} />
        </Pressable>

        <MadeBy />
      </ScrollView>

      {/* The only place where new words are added. */}
      <Pressable style={styles.fab} onPress={() => router.push('/add')} accessibilityLabel="Kelime ekle">
        <Ionicons name="add" size={32} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function HeroStat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={18} color={colors.onPrimary} />
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

type TileProps = { accent: Accent; icon: IconName; title: string; subtitle: string; href: Href; badge?: number };

// A coloured square for one study area.
function Tile({ accent, icon, title, subtitle, href, badge }: TileProps) {
  return (
    <Pressable style={[styles.tile, { backgroundColor: accents[accent].main }]} onPress={() => router.push(href)}>
      <Bubbles />
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={24} color={colors.onPrimary} />
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: accents[accent].main }]}>{badge}</Text>
        </View>
      )}
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 96 },
  hero: {
    backgroundColor: colors.primary,
    margin: 16,
    marginBottom: 4,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
  },
  hello: { color: colors.onPrimary, fontSize: 26, fontWeight: '800' },
  heroQuestion: { color: colors.onPrimary, fontSize: 16, opacity: 0.9, marginTop: 4 },
  goal: { marginTop: 18 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { color: colors.onPrimary, fontSize: 13, fontWeight: '700', opacity: 0.9 },
  goalValue: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  goalTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  goalFill: { height: 10, borderRadius: 5, backgroundColor: colors.onPrimary },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroStatValue: { color: colors.onPrimary, fontSize: 22, fontWeight: '800', marginTop: 4 },
  heroStatLabel: { color: colors.onPrimary, fontSize: 12, opacity: 0.9 },
  syncStatus: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  tile: {
    // Two per row: half the width minus half the gap.
    width: '48%',
    flexGrow: 1,
    minHeight: 150,
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tileTitle: { color: colors.onPrimary, fontSize: 17, fontWeight: '800' },
  tileSubtitle: { color: colors.onPrimary, fontSize: 13, opacity: 0.9, marginTop: 4, lineHeight: 18 },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '800' },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  progressText: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
