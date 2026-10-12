import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/ui/styles';

type Mode = 'signIn' | 'register';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
      case 400:
        return 'Geçerli bir e-posta ve en az 8 karakterli bir şifre gir.';
      case 401:
        return 'E-posta veya şifre hatalı.';
      case 409:
        return 'Bu e-posta zaten kayıtlı.';
    }
  }
  return 'Beklenmeyen bir hata oluştu.';
}

export default function SignInScreen() {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await (mode === 'signIn' ? signIn(email, password) : register(email, password));
      // On success the session changes and the root layout switches to the home screen.
    } catch (e) {
      setError(errorMessage(e));
      setIsSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>LexiSync</Text>
        <Text style={styles.subtitle}>{mode === 'signIn' ? 'Giriş yap' : 'Hesap oluştur'}</Text>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} onPress={submit} disabled={!canSubmit}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>{mode === 'signIn' ? 'Giriş yap' : 'Kayıt ol'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'signIn' ? 'register' : 'signIn');
            setError(null);
          }}
        >
          <Text style={styles.link}>
            {mode === 'signIn' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: '800', textAlign: 'center', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  error: { color: colors.danger, marginBottom: 12 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 20 },
});
