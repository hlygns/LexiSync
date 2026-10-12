import type { Tx } from '@/db/client';
import { outbox, type Card, type Deck, type OutboxEntity } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';

// Must be called inside the transaction that makes the change: either both the change and
// its outbox row are saved, or neither is. A change can never be "saved but forgotten".
function enqueue(tx: Tx, entity: OutboxEntity, payload: Record<string, unknown>): void {
  tx.insert(outbox)
    .values({ changeId: uuidv7(), entity, payload, createdAt: new Date().toISOString() })
    .run();
  notifyChange();
}

export function enqueueDeck(tx: Tx, deck: Deck): void {
  enqueue(tx, 'deck', {
    id: deck.id,
    examId: deck.examId,
    name: deck.name,
    updatedAt: deck.updatedAt,
    deletedAt: deck.deletedAt,
  });
}

export function enqueueCard(tx: Tx, card: Card): void {
  enqueue(tx, 'card', {
    id: card.id,
    deckId: card.deckId,
    term: card.term,
    meaning: card.meaning,
    example: card.example,
    tags: card.tags,
    updatedAt: card.updatedAt,
    deletedAt: card.deletedAt,
  });
}

export function enqueueReviewLog(
  tx: Tx,
  log: { id: string; cardId: string; grade: number; reviewedAt: string; deviceId: string },
): void {
  enqueue(tx, 'reviewLog', log);
}

export function enqueueQuizResult(
  tx: Tx,
  result: { id: string; deckId: string; unitIndex: number; score: number; total: number; completedAt: string; deviceId: string },
): void {
  enqueue(tx, 'quizResult', result);
}

// The sync engine subscribes here to learn that there is something new to push.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyChange(): void {
  listeners.forEach((listener) => listener());
}
