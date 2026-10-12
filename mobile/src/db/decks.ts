import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { cards, decks } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';
import { enqueueDeck } from '@/sync/outbox';

export function createDeck(input: { name: string; examId: number }): string {
  const id = uuidv7();
  db.transaction((tx) => {
    const deck = tx
      .insert(decks)
      .values({ id, name: input.name.trim(), examId: input.examId, updatedAt: new Date().toISOString() })
      .returning()
      .get();
    enqueueDeck(tx, deck);
  });
  return id;
}

// Marks the deck and all of its cards as deleted, in one transaction: either everything is marked or nothing is.
// Only the deck goes to the outbox; the server marks the deck's cards itself when it applies the delete.
export function deleteDeck(id: string): void {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    const deck = tx
      .update(decks)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(decks.id, id))
      .returning()
      .get();
    tx.update(cards)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(cards.deckId, id), isNull(cards.deletedAt)))
      .run();
    if (deck) {
      enqueueDeck(tx, deck);
    }
  });
}
