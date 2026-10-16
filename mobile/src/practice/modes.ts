import type { Ionicons } from '@expo/vector-icons';

import type { PracticeMode } from '@/db/schema';
import type { Accent } from '@/ui/styles';

export type IconName = keyof typeof Ionicons.glyphMap;

// How each practice mode is presented, shared by the home, practice and progress screens.
export const MODES: Record<PracticeMode, { title: string; description: string; icon: IconName; accent: Accent }> = {
  general: {
    title: 'Genel Test',
    description: 'Karışık 20 soru ile kendini dene',
    icon: 'trophy',
    accent: 'wine',
  },
  vocab: {
    title: 'Kelime Testi',
    description: 'İngilizce ⇄ Türkçe kelime',
    icon: 'swap-horizontal',
    accent: 'berry',
  },
  cloze: {
    title: 'Cloze Test',
    description: 'Boşluğa uygun kelimeyi bul',
    icon: 'create',
    accent: 'plum',
  },
  translation: {
    title: 'Çeviri',
    description: 'Cümle çevirisi, iki yönde',
    icon: 'language',
    accent: 'coral',
  },
};
