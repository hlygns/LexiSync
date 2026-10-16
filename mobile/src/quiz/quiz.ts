// Builds every kind of question the app asks, each with an explanation for the result screen.
// Pure: no database, no clock; randomness and the sentence translations are passed in.

import type { TranslationItem } from '@/practice/translations';

export const UNIT_SIZE = 20;
// Share of correct answers needed to unlock the next unit.
export const PASS_RATIO = 0.7;

export type QuizCard = { id: string; term: string; meaning: string; example: string | null };

export type QuestionKind =
  | 'meaning' // given the English word, pick its Turkish meaning
  | 'reverse' // given the Turkish meaning, pick the English word
  | 'cloze' // given a sentence with the word blanked out, pick the word
  | 'translation'; // given a sentence, pick its translation

export type Question = {
  id: string;
  // The vocabulary card the question is about; null for translation questions.
  cardId: string | null;
  kind: QuestionKind;
  // Shown above the prompt, in Turkish.
  instruction: string;
  prompt: string;
  options: string[];
  answer: string;
  // Shown on the result screen for a wrong or blank answer: why the answer is right, in Turkish.
  explanation: string[];
};

export type PracticeMode = 'vocab' | 'cloze' | 'translation' | 'general';

// Number of questions in a practice session of each mode.
export const PRACTICE_SIZE: Record<PracticeMode, number> = { vocab: 10, cloze: 10, translation: 10, general: 20 };

export type Random = () => number;

// Turkish translation of a card's n-th example sentence, if one is known.
export type SentenceTranslator = (term: string, index: number) => string | undefined;

const noTranslation: SentenceTranslator = () => undefined;

export function isPass(score: number, total: number): boolean {
  return total > 0 && score / total >= PASS_RATIO;
}

// Cards are grouped into units of 20 in the order they were created.
export function splitIntoUnits<T>(cards: T[]): T[][] {
  const units: T[][] = [];
  for (let i = 0; i < cards.length; i += UNIT_SIZE) {
    units.push(cards.slice(i, i + UNIT_SIZE));
  }
  return units;
}

export function shuffle<T>(items: T[], random: Random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Replaces the word in the sentence with a blank, also when it is inflected ("derive" -> "derived").
// Returns null if the word cannot be found, so the caller can fall back to another question type.
export function blankOut(sentence: string, term: string): string | null {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const words = term.trim().split(/\s+/);

  // Each word of the term may end differently: drop a final "e"/"y" and allow any ending.
  const pattern = words
    .map((word) => {
      const stem = word.length > 4 ? word.replace(/[ey]$/i, '') : word;
      return `${escape(stem)}[a-z]*`;
    })
    .join('\\s+');

  const regex = new RegExp(`\\b${pattern}\\b`, 'i');
  return regex.test(sentence) ? sentence.replace(regex, '_____') : null;
}

function pickOptions(correct: string, candidates: string[], random: Random): string[] {
  const wrong = shuffle(
    [...new Set(candidates)].filter((candidate) => candidate !== correct),
    random,
  ).slice(0, 3);
  return shuffle([correct, ...wrong], random);
}

// "Diğer şıklar: acquire = edinmek · adapt = uyum sağlamak"
function otherOptions(options: string[], answer: string, describe: (option: string) => string): string {
  return `Diğer şıklar: ${options
    .filter((option) => option !== answer)
    .map(describe)
    .join(' · ')}`;
}

function meaningQuestion(card: QuizCard, pool: QuizCard[], random: Random): Question {
  const options = pickOptions(card.meaning, pool.map((c) => c.meaning), random);
  const termOf = (meaning: string) => pool.find((c) => c.meaning === meaning)?.term ?? '?';
  return {
    id: `meaning-${card.id}`,
    cardId: card.id,
    kind: 'meaning',
    instruction: 'Bu kelimenin Türkçesi hangisi?',
    prompt: card.term,
    options,
    answer: card.meaning,
    explanation: [
      `“${card.term}” = ${card.meaning}`,
      otherOptions(options, card.meaning, (option) => `“${option}” = ${termOf(option)}`),
    ],
  };
}

function reverseQuestion(card: QuizCard, pool: QuizCard[], random: Random): Question {
  const options = pickOptions(card.term, pool.map((c) => c.term), random);
  const meaningOf = (term: string) => pool.find((c) => c.term === term)?.meaning ?? '?';
  return {
    id: `reverse-${card.id}`,
    cardId: card.id,
    kind: 'reverse',
    instruction: 'Bu anlamın İngilizcesi hangisi?',
    prompt: card.meaning,
    options,
    answer: card.term,
    explanation: [
      `“${card.meaning}” = ${card.term}`,
      otherOptions(options, card.term, (option) => `${option} = ${meaningOf(option)}`),
    ],
  };
}

// null when the card has no example sentence in which the word can be found.
function clozeQuestion(card: QuizCard, pool: QuizCard[], random: Random, translate: SentenceTranslator): Question | null {
  const sentences = (card.example ?? '').split('\n').filter((line) => line.trim().length > 0);
  if (sentences.length === 0) return null;

  const index = Math.floor(random() * sentences.length);
  const blanked = blankOut(sentences[index], card.term);
  if (!blanked) return null;

  const options = pickOptions(card.term, pool.map((c) => c.term), random);
  const meaningOf = (term: string) => pool.find((c) => c.term === term)?.meaning ?? '?';
  const turkish = translate(card.term, index);

  return {
    id: `cloze-${card.id}`,
    cardId: card.id,
    kind: 'cloze',
    instruction: 'Boşluğa hangi kelime gelmeli?',
    prompt: blanked,
    options,
    answer: card.term,
    explanation: [
      ...(turkish ? [`Cümlenin Türkçesi: ${turkish}`] : []),
      `Boşluğa “${card.term}” (${card.meaning}) gelir; cümlenin anlamı bunu gerektiriyor.`,
      otherOptions(options, card.term, (option) => `${option} = ${meaningOf(option)}`),
    ],
  };
}

function translationQuestion(item: TranslationItem, random: Random): Question {
  return {
    id: `translation-${item.id}`,
    cardId: null,
    kind: 'translation',
    instruction:
      item.direction === 'en-tr' ? 'Bu cümlenin Türkçe karşılığı hangisi?' : 'Bu cümlenin İngilizce karşılığı hangisi?',
    prompt: item.sentence,
    options: shuffle([item.correct, ...item.wrong], random),
    answer: item.correct,
    explanation: [item.explanation],
  };
}

// The test at the end of a unit: one question per card, alternating meaning and cloze.
// Wrong options come from the pool (the rest of the deck), so they are words the user is learning.
export function buildQuiz(
  unit: QuizCard[],
  pool: QuizCard[],
  random: Random = Math.random,
  translate: SentenceTranslator = noTranslation,
): Question[] {
  const everyCard = [...unit, ...pool.filter((card) => !unit.some((u) => u.id === card.id))];

  const questions = unit.map((card, index) => {
    // A card without a usable example always gets a meaning question.
    const cloze = index % 2 === 1 ? clozeQuestion(card, everyCard, random, translate) : null;
    return cloze ?? meaningQuestion(card, everyCard, random);
  });

  return shuffle(questions, random);
}

// A free practice session in the chosen mode, drawn from all words and the translation bank.
// Returns fewer questions than usual, possibly none, when there is not enough material.
export function buildPractice(
  mode: PracticeMode,
  cards: QuizCard[],
  translations: TranslationItem[],
  random: Random = Math.random,
  translate: SentenceTranslator = noTranslation,
): Question[] {
  const words = shuffle(cards, random);

  const vocab = (count: number) =>
    words
      .slice(0, count)
      .map((card, index) => (index % 2 === 0 ? meaningQuestion(card, cards, random) : reverseQuestion(card, cards, random)));

  const cloze = (count: number, skip = 0) =>
    words
      .slice(skip)
      .map((card) => clozeQuestion(card, cards, random, translate))
      .filter((question) => question !== null)
      .slice(0, count);

  const translation = (count: number) =>
    shuffle(translations, random)
      .slice(0, count)
      .map((item) => translationQuestion(item, random));

  // Multiple-choice questions need four different options.
  const enoughWords = cards.length >= 4;
  const size = PRACTICE_SIZE[mode];

  switch (mode) {
    case 'vocab':
      return enoughWords ? vocab(size) : [];
    case 'cloze':
      return enoughWords ? cloze(size) : [];
    case 'translation':
      return translation(size);
    case 'general': {
      // Roughly a third of each kind; cloze uses different words than the vocabulary questions.
      const parts = enoughWords ? [...vocab(7), ...cloze(7, 7)] : [];
      return shuffle([...parts, ...translation(size - parts.length)], random);
    }
  }
}
