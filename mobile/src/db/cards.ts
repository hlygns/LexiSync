import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';
import { enqueueCard } from '@/sync/outbox';

export type CardInput = { term: string; meaning: string; example: string; tags: string[] };

function toColumns(input: CardInput) {
  return {
    term: input.term.trim(),
    meaning: input.meaning.trim(),
    example: input.example.trim() || null,
    tags: input.tags,
    updatedAt: new Date().toISOString(),
  };
}

export function createCard(deckId: string, input: CardInput): string {
  const id = uuidv7();
  db.transaction((tx) => {
    const card = tx
      .insert(cards)
      .values({ id, deckId, ...toColumns(input) })
      .returning()
      .get();
    enqueueCard(tx, card);
  });
  return id;
}

export function updateCard(id: string, input: CardInput): void {
  db.transaction((tx) => {
    const card = tx.update(cards).set(toColumns(input)).where(eq(cards.id, id)).returning().get();
    if (card) {
      enqueueCard(tx, card);
    }
  });
}

export function deleteCard(id: string): void {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    const card = tx
      .update(cards)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(cards.id, id))
      .returning()
      .get();
    if (card) {
      enqueueCard(tx, card);
    }
  });
}
