import { STARTER_DECKS } from '@/starter/starterData';

import { blankOut, buildQuiz, isPass, shuffle, splitIntoUnits, UNIT_SIZE, type QuizCard } from './quiz';

// Deterministic "random" numbers, so a failing test fails the same way every time.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function cardsOf(deckIndex: number): QuizCard[] {
  return STARTER_DECKS[deckIndex].words.map(([term, meaning, example1, example2], i) => ({
    id: `card-${deckIndex}-${i}`,
    term,
    meaning,
    example: `${example1}\n${example2}`,
  }));
}

describe('splitIntoUnits', () => {
  test('groups cards into units of 20, the last one may be shorter', () => {
    const units = splitIntoUnits(Array.from({ length: 45 }, (_, i) => i));

    expect(units.map((unit) => unit.length)).toEqual([UNIT_SIZE, UNIT_SIZE, 5]);
    expect(units[1][0]).toBe(20);
  });

  test('no cards, no units', () => {
    expect(splitIntoUnits([])).toEqual([]);
  });
});

describe('isPass', () => {
  test('70 percent or more passes', () => {
    expect(isPass(14, 20)).toBe(true);
    expect(isPass(20, 20)).toBe(true);
  });

  test('less than 70 percent fails', () => {
    expect(isPass(13, 20)).toBe(false);
    expect(isPass(0, 20)).toBe(false);
    expect(isPass(0, 0)).toBe(false);
  });
});

describe('blankOut', () => {
  test('blanks the word itself', () => {
    expect(blankOut('Water is essential for all forms of life.', 'essential')).toBe('Water is _____ for all forms of life.');
  });

  test('blanks inflected forms', () => {
    expect(blankOut('Many English words are derived from Latin.', 'derive')).toBe('Many English words are _____ from Latin.');
    expect(blankOut('The law applies to everyone.', 'apply')).toBe('The law _____ to everyone.');
    expect(blankOut('Dust accumulates quickly.', 'accumulate')).toBe('Dust _____ quickly.');
  });

  test('blanks a term made of several words', () => {
    expect(blankOut('You can borrow it provided that you return it.', 'provided that')).toBe('You can borrow it _____ you return it.');
  });

  test('is not confused by capital letters at the start of a sentence', () => {
    expect(blankOut('Although it was raining, they played.', 'although')).toBe('_____ it was raining, they played.');
  });

  test('returns null when the word is not in the sentence', () => {
    expect(blankOut('This sentence is about something else.', 'abandon')).toBeNull();
  });
});

describe('buildQuiz', () => {
  const deck = cardsOf(0);
  const unit = deck.slice(0, UNIT_SIZE);

  test('asks exactly one question about every card in the unit', () => {
    const quiz = buildQuiz(unit, deck, seeded(1));

    expect(quiz).toHaveLength(UNIT_SIZE);
    expect(quiz.map((q) => q.cardId).sort()).toEqual(unit.map((c) => c.id).sort());
  });

  test('every question has four different options, one of which is the answer', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const question of buildQuiz(unit, deck, seeded(seed))) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.options).toContain(question.answer);
      }
    }
  });

  test('mixes meaning questions and fill-in-the-blank questions', () => {
    const kinds = buildQuiz(unit, deck, seeded(7)).map((q) => q.kind);

    expect(kinds.filter((kind) => kind === 'meaning')).toHaveLength(10);
    expect(kinds.filter((kind) => kind === 'cloze')).toHaveLength(10);
  });

  test('a fill-in-the-blank question hides the word and offers words as options', () => {
    const cloze = buildQuiz(unit, deck, seeded(3)).filter((q) => q.kind === 'cloze');

    for (const question of cloze) {
      expect(question.prompt).toContain('_____');
      expect(question.prompt.toLowerCase()).not.toContain(question.answer.toLowerCase());
      expect(deck.map((c) => c.term)).toEqual(expect.arrayContaining(question.options));
    }
  });

  test('the answer is not always in the same position', () => {
    const positions = buildQuiz(unit, deck, seeded(11)).map((q) => q.options.indexOf(q.answer));

    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  test('cards without an example sentence get meaning questions only', () => {
    const plain = unit.map((card) => ({ ...card, example: null }));

    expect(buildQuiz(plain, plain, seeded(1)).every((q) => q.kind === 'meaning')).toBe(true);
  });

  test('a short last unit borrows wrong options from the rest of the deck', () => {
    const shortUnit = deck.slice(0, 2);

    for (const question of buildQuiz(shortUnit, deck, seeded(5))) {
      expect(question.options).toHaveLength(4);
    }
  });

  test('every starter word can be turned into a fill-in-the-blank question from both of its sentences', () => {
    const failures: string[] = [];
    for (const starter of STARTER_DECKS) {
      for (const [term, , example1, example2] of starter.words) {
        if (!blankOut(example1, term) || !blankOut(example2, term)) failures.push(term);
      }
    }

    expect(failures).toEqual([]);
  });
});

describe('shuffle', () => {
  test('keeps every item and does not change the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, seeded(9));

    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
