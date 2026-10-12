import { StyleSheet } from 'react-native';

// Dusty pink and red.
export const colors = {
  primary: '#C2415B', // rose red: headers, main buttons
  primaryDark: '#9F2D45',
  pink: '#E7BCC3', // dusty pink: accents, progress tracks
  pinkSoft: '#F8E8EB', // tiles and cards
  background: '#FDF7F8',
  surface: '#FFFFFF',
  text: '#3A2A2E',
  muted: '#8A6F75',
  border: '#EBD3D8',
  success: '#3F8F6B',
  danger: '#C0392B',
  onPrimary: '#FFFFFF',
};

// Styles shared by more than one screen.
export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  label: { fontSize: 14, color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
  outlineButton: {
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  outlineButtonText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  dangerText: { color: colors.danger, fontSize: 15, textAlign: 'center', padding: 14 },
  // A white rounded card on the pink background.
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  rowTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  rowSubtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  // Small coloured heading above a group of items.
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 48, paddingHorizontal: 32, fontSize: 16, lineHeight: 22 },
  footer: { padding: 16, gap: 10 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.pink, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
