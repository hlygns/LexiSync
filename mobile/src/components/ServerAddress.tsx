import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError, request } from '@/api/client';
import { getApiUrl, setApiUrl } from '@/api/server';
import { colors, common } from '@/ui/styles';

type Check = 'idle' | 'checking' | 'ok' | 'failed';

// Shows which server the app talks to, and lets the user change it when the home computer's
// IP address has changed. "Kaydet ve dene" saves the address and calls /health on it.
export function ServerAddress() {
  const [current, setCurrent] = useState(() => getApiUrl() ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [check, setCheck] = useState<Check>('idle');

  async function saveAndTest() {
    const saved = setApiUrl(draft);
    setCurrent(saved);
    setIsEditing(false);
    setCheck('checking');
    try {
      await request('GET', '/health');
      setCheck('ok');
    } catch (error) {
      setCheck(error instanceof ApiError ? 'failed' : 'failed');
    }
  }

  const host = current.replace(/^https?:\/\//, '');

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Ionicons name="server" size={16} color={colors.muted} />
        <Text style={styles.label}>Sunucu: {host || 'ayarlı değil'}</Text>
        {!isEditing && (
          <Pressable
            onPress={() => {
              setDraft(host);
              setCheck('idle');
              setIsEditing(true);
            }}
            hitSlop={8}
          >
            <Text style={styles.change}>Değiştir</Text>
          </Pressable>
        )}
      </View>

      {check === 'checking' && <ActivityIndicator color={colors.primary} style={styles.status} />}
      {check === 'ok' && <Text style={[styles.status, styles.ok]}>Bağlantı başarılı ✓</Text>}
      {check === 'failed' && (
        <Text style={[styles.status, styles.failed]}>
          {"Ulaşılamadı. Bilgisayarda Docker açık mı, telefon aynı Wi-Fi'da mı, IP doğru mu?"}
        </Text>
      )}

      {isEditing && (
        <View style={styles.editor}>
          <Text style={styles.hint}>
            {"Bilgisayarda 'ipconfig' yaz, Wi-Fi'ın IPv4 adresini gir (ör. 192.168.1.49)."}
          </Text>
          <TextInput
            style={[common.input, styles.input]}
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="192.168.1.49"
            placeholderTextColor={colors.muted}
          />
          <View style={styles.buttons}>
            <Pressable style={[common.outlineButton, styles.button]} onPress={() => setIsEditing(false)}>
              <Text style={common.outlineButtonText}>Vazgeç</Text>
            </Pressable>
            <Pressable
              style={[common.button, styles.button, draft.trim().length === 0 && common.buttonDisabled]}
              disabled={draft.trim().length === 0}
              onPress={saveAndTest}
            >
              <Text style={common.buttonText}>Kaydet ve dene</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: 13, color: colors.muted },
  change: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  status: { marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 18 },
  ok: { color: colors.success, fontWeight: '700' },
  failed: { color: colors.danger },
  editor: { marginTop: 10 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 8, lineHeight: 18 },
  input: { marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1 },
});
