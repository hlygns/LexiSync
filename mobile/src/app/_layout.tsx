import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { db } from '@/db/client';
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
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // Render nothing until we know whether a session exists, to avoid flashing the sign-in screen.
  if (isLoading) {
    return null;
  }

  const isSignedIn = session !== null;

  return (
    <Stack>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" options={{ title: 'Destelerim' }} />
        <Stack.Screen name="deck/new" options={{ title: 'Yeni deste' }} />
        <Stack.Screen name="deck/[id]" />
        <Stack.Screen name="card/new" options={{ title: 'Yeni kart' }} />
        <Stack.Screen name="card/[id]" options={{ title: 'Kartı düzenle' }} />
        <Stack.Screen name="study/[deckId]" options={{ title: 'Çalışma' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
