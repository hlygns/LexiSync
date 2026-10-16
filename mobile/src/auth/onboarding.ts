import type { IconName } from '@/practice/modes';

// Choices on the sign-up cards. The ids match User.Motivations on the server.
export const MOTIVATIONS: { id: string; label: string; icon: IconName; cheer: string }[] = [
  { id: 'academic', label: 'Akademik kariyer', icon: 'school', cheer: 'Akademik kariyerine bir adım daha.' },
  { id: 'graduate', label: 'Yüksek lisans / doktora', icon: 'library', cheer: 'Lisansüstü hedefine bir adım daha.' },
  { id: 'career', label: 'İş ve terfi', icon: 'briefcase', cheer: 'Kariyer hedefine bir adım daha.' },
  { id: 'abroad', label: 'Yurt dışı', icon: 'airplane', cheer: 'Yurt dışı hayaline bir adım daha.' },
  { id: 'self', label: 'Kendimi geliştirmek', icon: 'sparkles', cheer: 'Her gün biraz daha iyisi.' },
];

// Daily goal, counted in words studied (reviews and unit test answers).
export const DAILY_GOALS: { words: number; label: string; detail: string }[] = [
  { words: 10, label: 'Hafif', detail: 'Günde ~10 dakika · 10 kelime' },
  { words: 20, label: 'Düzenli', detail: 'Günde ~20 dakika · 20 kelime' },
  { words: 30, label: 'Ciddi', detail: 'Günde ~30 dakika · 30 kelime' },
  { words: 50, label: 'Yoğun', detail: 'Günde 45+ dakika · 50 kelime' },
];

// Same rule as the server: 3-30 characters, lowercase letters, digits, "." and "_".
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._]{3,30}$/.test(username.trim().toLowerCase());
}

export const MIN_PASSWORD_LENGTH = 8;
