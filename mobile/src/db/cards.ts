import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';

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
  db.insert(cards)
    .values({ id, deckId, ...toColumns(input) })
    .run();
  return id;
}

export function updateCard(id: string, input: CardInput): void {
  db.update(cards).set(toColumns(input)).where(eq(cards.id, id)).run();
}

export function deleteCard(id: string): void {
  const now = new Date().toISOString();
  db.update(cards).set({ deletedAt: now, updatedAt: now }).where(eq(cards.id, id)).run();
}
