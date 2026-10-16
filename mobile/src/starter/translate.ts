import type { SentenceTranslator } from '@/quiz/quiz';
import { SENTENCE_TRANSLATIONS } from '@/starter/sentenceTranslations';

// Turkish of a built-in word's n-th example sentence. Words the user added have none.
export const translateSentence: SentenceTranslator = (term, index) => SENTENCE_TRANSLATIONS[term]?.[index];
