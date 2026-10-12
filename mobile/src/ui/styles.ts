import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#2563eb',
  danger: '#b00020',
  text: '#111',
  muted: '#666',
  border: '#ccc',
  background: '#fff',
};

// Styles shared by more than one screen.
export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  label: { fontSize: 14, color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dangerText: { color: colors.danger, fontSize: 16, textAlign: 'center', padding: 14 },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 48, paddingHorizontal: 32, fontSize: 16 },
  footer: { padding: 16 },
});
