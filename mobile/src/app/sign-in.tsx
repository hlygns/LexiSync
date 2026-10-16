import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { DAILY_GOALS, isValidUsername, MIN_PASSWORD_LENGTH, MOTIVATIONS } from '@/auth/onboarding';
import { Bubbles, MadeBy } from '@/components/Decor';
import { ServerAddress } from '@/components/ServerAddress';
import { ShinyLogo } from '@/components/ShinyLogo';
import { colors, common } from '@/ui/styles';

type Mode = 'welcome' | 'register' | 'login';

function errorMessage(error: unknown, mode: Mode): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
      case 400:
        return mode === 'register'
          ? `Kullanıcı adı 3–30 karakter olmalı (küçük harf, rakam, . veya _), şifre en az ${MIN_PASSWORD_LENGTH} karakter.`
          : 'Kullanıcı adını ve şifreni yaz.';
      case 401:
        return 'Kullanıcı adı veya şifre hatalı.';
      case 409:
        return 'Bu kullanıcı adı alınmış, başka bir tane dene.';
    }
  }
  return 'Beklenmeyen bir hata oluştu.';
}

// The first screen: a welcome page, then either the sign-up cards or the sign-in card.
export default function WelcomeScreen() {
  const [mode, setMode] = useState<Mode>('welcome');

  return (
    <SafeAreaView style={common.screen}>
      {mode === 'welcome' && <Welcome onRegister={() => setMode('register')} onLogin={() => setMode('login')} />}
      {mode === 'register' && <RegisterCards onBack={() => setMode('welcome')} onLogin={() => setMode('login')} />}
      {mode === 'login' && <LoginCard onBack={() => setMode('welcome')} onRegister={() => setMode('register')} />}
    </SafeAreaView>
  );
}

function Welcome({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeTop}>
        <ShinyLogo size={128} />
        <Text style={styles.brand}>LexiSync</Text>
        <Text style={styles.tagline}>YDS kelimeleri, her gün biraz</Text>

        <View style={styles.features}>
          <Feature icon="book" text="Ünite ünite 224 YDS kelimesi, her biri iki örnek cümleyle" />
          <Feature icon="create" text="Cloze test, çeviri ve genel testlerle kendini dene" />
          <Feature icon="cloud-done" text="İnternet olmadan da çalışır, sonra eşitlenir" />
        </View>
      </View>

      <View style={styles.welcomeButtons}>
        <Pressable style={common.button} onPress={onRegister}>
          <Text style={common.buttonText}>Hadi başlayalım</Text>
        </Pressable>
        <Pressable style={common.outlineButton} onPress={onLogin}>
          <Text style={common.outlineButtonText}>Zaten hesabım var</Text>
        </Pressable>
        <ServerAddress />
        <MadeBy />
      </View>
    </View>
  );
}

function Feature({ icon, text }: { icon: 'book' | 'create' | 'cloud-done'; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const PAGES = 3;

// Sign-up as swipeable cards, shown once: why YDS, how much a day, then the account itself.
function RegisterCards({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);

  const [page, setPage] = useState(0);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardWidth = width - 32;

  function goTo(next: number) {
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  }

  function onSwipe(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  const usernameOk = isValidUsername(username);
  const passwordOk = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = motivation !== null && dailyGoal !== null && usernameOk && passwordOk && !isSubmitting;

  async function submit() {
    if (motivation === null || dailyGoal === null) {
      goTo(motivation === null ? 0 : 1);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ username, password, motivation, dailyGoal });
      // On success the session appears and the app switches to the home screen by itself.
    } catch (e) {
      setError(errorMessage(e, 'register'));
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable onPress={page === 0 ? onBack : () => goTo(page - 1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: PAGES }, (_, index) => (
            <View key={index} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSwipe}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. Motivation */}
        <View style={[styles.page, { width }]}>
          <View style={[styles.card, { width: cardWidth }]}>
            <Bubbles tint={colors.primary} />
            <Text style={styles.step}>1 / 3</Text>
            <Text style={styles.cardTitle}>{"Seni YDS'ye ne hazırlıyor?"}</Text>
            <Text style={styles.cardSubtitle}>Ana sayfada sana buna göre seslenelim.</Text>
            {MOTIVATIONS.map((item) => (
              <Choice
                key={item.id}
                icon={item.icon}
                label={item.label}
                selected={motivation === item.id}
                onPress={() => setMotivation(item.id)}
              />
            ))}
          </View>
        </View>

        {/* 2. Daily goal */}
        <View style={[styles.page, { width }]}>
          <View style={[styles.card, { width: cardWidth }]}>
            <Bubbles tint={colors.primary} />
            <Text style={styles.step}>2 / 3</Text>
            <Text style={styles.cardTitle}>Günde ne kadar çalışacaksın?</Text>
            <Text style={styles.cardSubtitle}>Ana sayfada günlük hedefini takip edeceğiz.</Text>
            {DAILY_GOALS.map((goal) => (
              <Choice
                key={goal.words}
                icon="time"
                label={goal.label}
                detail={goal.detail}
                selected={dailyGoal === goal.words}
                onPress={() => setDailyGoal(goal.words)}
              />
            ))}
          </View>
        </View>

        {/* 3. Account */}
        <View style={[styles.page, { width }]}>
          <View style={[styles.card, { width: cardWidth }]}>
            <Bubbles tint={colors.primary} />
            <Text style={styles.step}>3 / 3</Text>
            <Text style={styles.cardTitle}>Son adım: hesabını aç</Text>
            <Text style={styles.cardSubtitle}>Kelimelerin ve ilerlemen bu hesapta saklanır.</Text>

            <Text style={common.label}>Kullanıcı adı</Text>
            <TextInput
              style={common.input}
              value={username}
              onChangeText={setUsername}
              placeholder="ör. hulya.yds"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {username.length > 0 && !usernameOk && (
              <Text style={styles.hint}>3–30 karakter: küçük harf, rakam, nokta veya alt çizgi.</Text>
            )}

            <Text style={common.label}>Şifre</Text>
            <TextInput
              style={common.input}
              value={password}
              onChangeText={setPassword}
              placeholder={`En az ${MIN_PASSWORD_LENGTH} karakter`}
              placeholderTextColor={colors.muted}
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={[common.button, !canSubmit && common.buttonDisabled]} disabled={!canSubmit} onPress={submit}>
              {isSubmitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={common.buttonText}>Hesabımı oluştur</Text>
              )}
            </Pressable>
            <Pressable onPress={onLogin}>
              <Text style={styles.link}>Zaten hesabın var mı? Giriş yap</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {page < PAGES - 1 && (
        <View style={common.footer}>
          <Pressable
            style={[common.button, (page === 0 ? motivation : dailyGoal) === null && common.buttonDisabled]}
            disabled={(page === 0 ? motivation : dailyGoal) === null}
            onPress={() => goTo(page + 1)}
          >
            <Text style={common.buttonText}>Devam</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

type ChoiceProps = {
  icon: (typeof MOTIVATIONS)[number]['icon'] | 'time';
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
};

function Choice({ icon, label, detail, selected, onPress }: ChoiceProps) {
  return (
    <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
        <Ionicons name={icon} size={20} color={selected ? colors.onPrimary : colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
        {detail && <Text style={[styles.choiceDetail, selected && styles.choiceLabelSelected]}>{detail}</Text>}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={colors.onPrimary} />}
    </Pressable>
  );
}

function LoginCard({ onBack, onRegister }: { onBack: () => void; onRegister: () => void }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(username, password);
    } catch (e) {
      setError(errorMessage(e, 'login'));
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>

        <View style={styles.loginLogo}>
          <ShinyLogo size={88} />
        </View>

        <View style={styles.card}>
          <Bubbles tint={colors.primary} />
          <Text style={styles.cardTitle}>Tekrar hoş geldin</Text>
          <Text style={styles.cardSubtitle}>Kaldığın yerden devam et.</Text>

          <Text style={common.label}>Kullanıcı adı</Text>
          <TextInput
            style={common.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={common.label}>Şifre</Text>
          <TextInput style={common.input} value={password} onChangeText={setPassword} secureTextEntry />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[common.button, !canSubmit && common.buttonDisabled]} disabled={!canSubmit} onPress={submit}>
            {isSubmitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={common.buttonText}>Giriş yap</Text>}
          </Pressable>
          <Pressable onPress={onRegister}>
            <Text style={styles.link}>Hesabın yok mu? Kayıt ol</Text>
          </Pressable>
        </View>

        <ServerAddress />
        <MadeBy />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  welcome: { flex: 1, justifyContent: 'space-between', padding: 24 },
  welcomeTop: { alignItems: 'center', paddingTop: 24 },
  brand: { fontSize: 40, fontWeight: '800', color: colors.primary, marginTop: 8 },
  tagline: { fontSize: 16, color: colors.muted, marginTop: 4 },
  features: { alignSelf: 'stretch', gap: 12, marginTop: 32 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  welcomeButtons: { gap: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  topBarSpacer: { width: 28 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink },
  dotActive: { width: 24, backgroundColor: colors.primary },
  page: { alignItems: 'center', paddingTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  step: { fontSize: 13, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 6 },
  cardSubtitle: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 18, lineHeight: 21 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconSelected: { backgroundColor: 'rgba(255,255,255,0.22)' },
  choiceLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  choiceDetail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  choiceLabelSelected: { color: colors.onPrimary },
  hint: { fontSize: 13, color: colors.muted, marginTop: -10, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 12, lineHeight: 20 },
  link: { color: colors.primary, textAlign: 'center', marginTop: 16, fontSize: 15 },
  loginContent: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 8, left: 8, zIndex: 1 },
  loginLogo: { alignItems: 'center', marginBottom: 8 },
});
