import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { db } from '@/db/client';
import { useAutoSync } from '@/sync/useSync';
import { colors } from '@/ui/styles';
import migrations from '../../drizzle/migrations';

export default function RootLayout() {
  // Creates or upgrades the on-device tables before any screen touches them.
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text>Veritabanı hazırlanamadı: {error.message}</Text>
      </View>
    );
  }
  if (!success) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // Syncing starts when a session exists and stops when it is gone.
  useAutoSync(session !== null);

  // Render nothing until we know whether a session exists, to avoid flashing the sign-in screen.
  if (isLoading) {
    return null;
  }

  const isSignedIn = session !== null;

  return (
    <Stack
      screenOptions={{
        // Every screen gets the same coloured header.
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" options={{ title: 'LexiSync' }} />
        <Stack.Screen name="profile" options={{ title: 'Profilim' }} />
        <Stack.Screen name="add" options={{ title: 'Kelime ekle' }} />
        <Stack.Screen name="words" options={{ title: 'Kelime Öğren' }} />
        <Stack.Screen name="deck/[id]" />
        <Stack.Screen name="unit/[deckId]" />
        <Stack.Screen name="word/[cardId]" />
        <Stack.Screen name="quiz/[deckId]" />
        <Stack.Screen name="review" options={{ title: 'Tekrar' }} />
        <Stack.Screen name="practice/[mode]" />
        <Stack.Screen name="progress" options={{ title: 'Gelişimim' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
