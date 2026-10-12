// Builds the test taken at the end of a unit. Pure: no database, no clock; randomness is passed in,
// so the tests can make it predictable.

export const UNIT_SIZE = 20;
// Share of correct answers needed to unlock the next unit.
export const PASS_RATIO = 0.7;

export type QuizCard = { id: string; term: string; meaning: string; example: string | null };

export type Question = {
  cardId: string;
  // 'meaning': given the word, pick its Turkish meaning.
  // 'cloze': given an example sentence with the word blanked out, pick the word.
  kind: 'meaning' | 'cloze';
  prompt: string;
  options: string[];
  answer: string;
};

export type Random = () => number;

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

// One question per card of the unit. Wrong options come from the pool (the rest of the deck),
// so they are always words the user is actually learning.
export function buildQuiz(unit: QuizCard[], pool: QuizCard[], random: Random = Math.random): Question[] {
  const everyCard = [...unit, ...pool.filter((card) => !unit.some((u) => u.id === card.id))];

  const questions = unit.map((card, index): Question => {
    const sentences = (card.example ?? '').split('\n').filter((line) => line.trim().length > 0);
    const sentence = sentences.length > 0 ? sentences[Math.floor(random() * sentences.length)] : null;
    const blanked = sentence ? blankOut(sentence, card.term) : null;

    // Alternate the two kinds; a card without a usable example always gets a meaning question.
    if (index % 2 === 1 && blanked) {
      return {
        cardId: card.id,
        kind: 'cloze',
        prompt: blanked,
        options: pickOptions(card.term, everyCard.map((c) => c.term), random),
        answer: card.term,
      };
    }
    return {
      cardId: card.id,
      kind: 'meaning',
      prompt: card.term,
      options: pickOptions(card.meaning, everyCard.map((c) => c.meaning), random),
      answer: card.meaning,
    };
  });

  return shuffle(questions, random);
}
