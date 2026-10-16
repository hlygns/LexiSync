import { TRANSLATIONS } from '@/practice/translations';
import { STARTER_DECKS } from '@/starter/starterData';

import { buildPractice, PRACTICE_SIZE, type PracticeMode, type QuizCard } from './quiz';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const allCards: QuizCard[] = STARTER_DECKS.flatMap((deck, d) =>
  deck.words.map(([term, meaning, example1, example2], i) => ({
    id: `card-${d}-${i}`,
    term,
    meaning,
    example: `${example1}\n${example2}`,
  })),
);

describe('buildPractice', () => {
  test.each(['vocab', 'cloze', 'translation', 'general'] as PracticeMode[])(
    '%s: full size, four different options, answer among them, no question twice',
    (mode) => {
      for (const seed of [1, 2, 3]) {
        const questions = buildPractice(mode, allCards, TRANSLATIONS, seeded(seed));

        expect(questions).toHaveLength(PRACTICE_SIZE[mode]);
        expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
        for (const question of questions) {
          expect(new Set(question.options).size).toBe(4);
          expect(question.options).toContain(question.answer);
          expect(question.instruction.length).toBeGreaterThan(0);
        }
      }
    },
  );

  test('vocab asks in both directions', () => {
    const kinds = buildPractice('vocab', allCards, TRANSLATIONS, seeded(4)).map((q) => q.kind);

    expect(kinds.filter((kind) => kind === 'meaning')).toHaveLength(5);
    expect(kinds.filter((kind) => kind === 'reverse')).toHaveLength(5);
  });

  test('a reverse question shows the Turkish meaning and offers English words', () => {
    const reverse = buildPractice('vocab', allCards, TRANSLATIONS, seeded(4)).filter((q) => q.kind === 'reverse');

    for (const question of reverse) {
      expect(allCards.map((card) => card.meaning)).toContain(question.prompt);
      expect(allCards.map((card) => card.term)).toEqual(expect.arrayContaining(question.options));
    }
  });

  test('cloze contains only fill-in-the-blank questions', () => {
    const questions = buildPractice('cloze', allCards, TRANSLATIONS, seeded(5));

    expect(questions.every((q) => q.kind === 'cloze' && q.prompt.includes('_____'))).toBe(true);
  });

  test('translation asks both directions over time and never repeats a sentence in a session', () => {
    const questions = buildPractice('translation', allCards, TRANSLATIONS, seeded(6));

    expect(questions.every((q) => q.kind === 'translation' && q.cardId === null)).toBe(true);
    expect(new Set(questions.map((q) => q.prompt)).size).toBe(questions.length);
  });

  test('the general test mixes every kind of question and does not ask about a word twice', () => {
    const questions = buildPractice('general', allCards, TRANSLATIONS, seeded(7));
    const kinds = new Set(questions.map((q) => q.kind));

    expect(kinds).toEqual(new Set(['meaning', 'reverse', 'cloze', 'translation']));
    const cardIds = questions.map((q) => q.cardId).filter((id) => id !== null);
    expect(new Set(cardIds).size).toBe(cardIds.length);
  });

  test('sessions differ from one another', () => {
    const first = buildPractice('general', allCards, TRANSLATIONS, seeded(1)).map((q) => q.id);
    const second = buildPractice('general', allCards, TRANSLATIONS, seeded(2)).map((q) => q.id);

    expect(first).not.toEqual(second);
  });

  test('without any words, word-based modes are empty and the general test falls back to translation', () => {
    expect(buildPractice('vocab', [], TRANSLATIONS, seeded(1))).toEqual([]);
    expect(buildPractice('cloze', [], TRANSLATIONS, seeded(1))).toEqual([]);

    const general = buildPractice('general', [], TRANSLATIONS, seeded(1));
    expect(general).toHaveLength(PRACTICE_SIZE.general);
    expect(general.every((q) => q.kind === 'translation')).toBe(true);
  });
});

describe('translation bank', () => {
  test('ids are unique and every item has four different options', () => {
    expect(new Set(TRANSLATIONS.map((item) => item.id)).size).toBe(TRANSLATIONS.length);
    for (const item of TRANSLATIONS) {
      expect(new Set([item.correct, ...item.wrong]).size).toBe(4);
    }
  });

  test('has the same number of questions in each direction', () => {
    const count = (direction: string) => TRANSLATIONS.filter((item) => item.direction === direction).length;

    expect(count('en-tr')).toBe(count('tr-en'));
  });

  test('options are written in the other language than the sentence', () => {
    const turkishLetters = /[çğıöşüÇĞİÖŞÜ]/;
    for (const item of TRANSLATIONS) {
      const optionsAreTurkish = [item.correct, ...item.wrong].every((option) => turkishLetters.test(option));
      expect([item.id, optionsAreTurkish]).toEqual([item.id, item.direction === 'en-tr']);
    }
  });
});

describe('explanations', () => {
  const { translateSentence } = require('@/starter/translate') as typeof import('@/starter/translate');

  test('every question of every mode explains its answer', () => {
    for (const mode of ['vocab', 'cloze', 'translation', 'general'] as PracticeMode[]) {
      for (const question of buildPractice(mode, allCards, TRANSLATIONS, seeded(3), translateSentence)) {
        expect(question.explanation.length).toBeGreaterThan(0);
        expect(question.explanation.every((line) => line.trim().length > 0)).toBe(true);
      }
    }
  });

  test('a cloze explanation gives the Turkish of the sentence and the meaning of every other option', () => {
    for (const question of buildPractice('cloze', allCards, TRANSLATIONS, seeded(8), translateSentence)) {
      const [turkish, reason, others] = question.explanation;

      expect(turkish).toMatch(/^Cümlenin Türkçesi: /);
      expect(reason).toContain(question.answer);
      for (const option of question.options.filter((o) => o !== question.answer)) {
        expect(others).toContain(`${option} = `);
      }
      expect(others).not.toContain('= ?');
    }
  });

  test('without a translation the cloze explanation still explains the word', () => {
    const [first] = buildPractice('cloze', allCards, TRANSLATIONS, seeded(8));

    expect(first.explanation[0]).toMatch(/^Boşluğa /);
  });

  test('a meaning explanation names the English word of every wrong option', () => {
    for (const question of buildPractice('vocab', allCards, TRANSLATIONS, seeded(9)).filter((q) => q.kind === 'meaning')) {
      expect(question.explanation[0]).toBe(`“${question.prompt}” = ${question.answer}`);
      expect(question.explanation[1]).not.toContain('= ?');
    }
  });

  test('every translation question has a written explanation', () => {
    expect(TRANSLATIONS.every((item) => item.explanation.length > 40)).toBe(true);
  });
});
