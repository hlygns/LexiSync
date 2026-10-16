import { STARTER_DECKS } from './starterData';

const allWords = STARTER_DECKS.flatMap((deck) => deck.words.map((word) => ({ deck: deck.name, word })));

describe('starter decks', () => {
  test('every word has a term, a meaning and two example sentences that use the term', () => {
    for (const { deck, word } of allWords) {
      const [term, meaning, example1, example2] = word;
      const label = `${deck} / ${term}`;

      expect([label, term.trim().length > 0, meaning.trim().length > 0]).toEqual([label, true, true]);
      for (const example of [example1, example2]) {
        // The first few letters are enough: "derive" appears as "derived", "apply" as "applied".
        const stem = term.toLowerCase().slice(0, Math.max(3, term.length - 2));
        expect([label, example.toLowerCase().includes(stem)]).toEqual([label, true]);
        expect([label, /[.!?]$/.test(example)]).toEqual([label, true]);
      }
      expect([label, example1 !== example2]).toEqual([label, true]);
    }
  });

  test('fits the limits the server enforces', () => {
    for (const { word } of allWords) {
      const [term, meaning, example1, example2] = word;
      expect(term.length).toBeLessThanOrEqual(200);
      expect(meaning.length).toBeLessThanOrEqual(500);
      expect(`${example1}\n${example2}`.length).toBeLessThanOrEqual(1000);
    }
  });

  test('no term is repeated inside a deck and deck names are unique', () => {
    for (const deck of STARTER_DECKS) {
      const terms = deck.words.map(([term]) => term);
      expect(new Set(terms).size).toBe(terms.length);
    }
    expect(new Set(STARTER_DECKS.map((deck) => deck.name)).size).toBe(STARTER_DECKS.length);
  });

  test('uses only exam ids that exist on the server', () => {
    expect(STARTER_DECKS.every((deck) => [1, 2, 3, 4].includes(deck.examId))).toBe(true);
  });
});

describe('sentence translations', () => {
  const { SENTENCE_TRANSLATIONS } = require('./sentenceTranslations') as typeof import('./sentenceTranslations');

  test('every built-in word has a Turkish translation for both of its example sentences', () => {
    const missing = allWords
      .map(({ word }) => word[0])
      .filter((term) => {
        const pair = SENTENCE_TRANSLATIONS[term];
        return !pair || pair.length !== 2 || pair.some((sentence) => sentence.trim().length === 0);
      });

    expect(missing).toEqual([]);
  });

  test('has no translations for words that do not exist', () => {
    const terms = new Set(allWords.map(({ word }) => word[0]));

    expect(Object.keys(SENTENCE_TRANSLATIONS).filter((term) => !terms.has(term))).toEqual([]);
  });
});
