import { and, eq, inArray, isNull } from 'drizzle-orm';

import { createCard, updateCard } from '@/db/cards';
import { db } from '@/db/client';
import { createDeck, deleteDeck } from '@/db/decks';
import { getMeta, setMeta } from '@/db/meta';
import { cards, decks } from '@/db/schema';
import { STARTER_DECKS } from '@/starter/starterData';

// Starter decks shipped by an earlier version. The app is YDS-only now, so they are removed.
const RETIRED_DECK_NAMES = [
  'YÖKDİL Fen — Temel terimler',
  'YÖKDİL Sağlık — Temel terimler',
  'YÖKDİL Sosyal — Temel terimler',
];

// Raise this when the built-in word list changes; every device then updates itself once.
const STARTER_VERSION = '3';
const STARTER_VERSION_KEY = 'starterVersion';

// Installs or updates the built-in words, once per version. Must run only after a successful sync:
// on a new device the account's existing decks have to arrive first, otherwise the same decks
// would be created a second time here.
export function ensureStarterContent(): void {
  if (getMeta(STARTER_VERSION_KEY) === STARTER_VERSION) return;
  addStarterDecks();
  setMeta(STARTER_VERSION_KEY, STARTER_VERSION);
}

// Adds the starter decks, or brings existing ones up to date. Safe to run more than once:
// a deck is matched by name and a card by its term, so nothing is duplicated, and a card
// the user has already written an example for is left alone.
// Goes through the normal create/update/delete functions, so everything is synced like any other change.
export function addStarterDecks(): { added: number; updated: number; removedDecks: number } {
  let added = 0;
  let updated = 0;

  const retired = db
    .select()
    .from(decks)
    .where(and(inArray(decks.name, RETIRED_DECK_NAMES), isNull(decks.deletedAt)))
    .all();
  retired.forEach((deck) => deleteDeck(deck.id));

  for (const starter of STARTER_DECKS) {
    const existingDeck = db
      .select()
      .from(decks)
      .where(and(eq(decks.name, starter.name), isNull(decks.deletedAt)))
      .get();
    const deckId = existingDeck?.id ?? createDeck({ name: starter.name, examId: starter.examId });

    const existingCards = new Map(
      db
        .select()
        .from(cards)
        .where(and(eq(cards.deckId, deckId), isNull(cards.deletedAt)))
        .all()
        .map((card) => [card.term, card]),
    );

    for (const [term, meaning, example1, example2] of starter.words) {
      const example = `${example1}\n${example2}`;
      const existing = existingCards.get(term);

      if (!existing) {
        createCard(deckId, { term, meaning, example, tags: [starter.tag] });
        added++;
      } else if (!existing.example) {
        updateCard(existing.id, { term, meaning: existing.meaning, example, tags: existing.tags });
        updated++;
      }
    }
  }

  return { added, updated, removedDecks: retired.length };
}
