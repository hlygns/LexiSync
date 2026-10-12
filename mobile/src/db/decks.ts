import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { cards, decks } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';

export function createDeck(input: { name: string; examId: number }): string {
  const id = uuidv7();
  db.insert(decks)
    .values({ id, name: input.name.trim(), examId: input.examId, updatedAt: new Date().toISOString() })
    .run();
  return id;
}

// Marks the deck and all of its cards as deleted, in one transaction: either everything is marked or nothing is.
export function deleteDeck(id: string): void {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(decks).set({ deletedAt: now, updatedAt: now }).where(eq(decks.id, id)).run();
    tx.update(cards)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(cards.deckId, id), isNull(cards.deletedAt)))
      .run();
  });
}
