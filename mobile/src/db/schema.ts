import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Same four fields as SyncEntity on the server. Dates are ISO strings, exactly as the API sends them.
const syncColumns = {
  // Guid v7 generated on this device.
  id: text('id').primaryKey(),
  updatedAt: text('updated_at').notNull(),
  // 0 until the server has seen the row.
  serverVersion: integer('server_version').notNull().default(0),
  // Tombstone: rows are marked, never removed, so the delete can be synced.
  deletedAt: text('deleted_at'),
};

export const decks = sqliteTable('decks', {
  ...syncColumns,
  examId: integer('exam_id').notNull(),
  name: text('name').notNull(),
});

export const cards = sqliteTable(
  'cards',
  {
    ...syncColumns,
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.id),
    term: text('term').notNull(),
    meaning: text('meaning').notNull(),
    example: text('example'),
    // SQLite has no array type; the list is stored as JSON text.
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  },
  (table) => [index('cards_deck_id_idx').on(table.deckId)],
);

// Append-only: one row per review, never updated. Logs from two devices simply add up.
export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id').notNull(),
    grade: integer('grade').notNull(),
    reviewedAt: text('reviewed_at').notNull(),
    deviceId: text('device_id').notNull(),
  },
  (table) => [index('review_logs_card_id_idx').on(table.cardId)],
);

// Current SM-2 state per card. Derived data: always rebuilt from review_logs, never synced.
export const reviewStates = sqliteTable(
  'review_states',
  {
    cardId: text('card_id').primaryKey(),
    easeFactor: real('ease_factor').notNull(),
    intervalDays: integer('interval_days').notNull(),
    repetitions: integer('repetitions').notNull(),
    dueAt: text('due_at').notNull(),
  },
  (table) => [index('review_states_due_at_idx').on(table.dueAt)],
);

export type OutboxEntity = 'deck' | 'card' | 'reviewLog';

// Changes waiting to be sent to the server. A row is written in the same transaction as the change itself.
export const outbox = sqliteTable('outbox', {
  // Send order.
  seq: integer('seq').primaryKey({ autoIncrement: true }),
  // Sent with the change; the server uses it to ignore a change it has already processed.
  changeId: text('change_id').notNull().unique(),
  entity: text('entity').$type<OutboxEntity>().notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  createdAt: text('created_at').notNull(),
});

// Small key-value store: device id, last pulled server version.
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Local copy of the server's exam list (GET /exams), so the list is available offline.
export const exams = sqliteTable('exams', {
  id: integer('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
});

export type Deck = typeof decks.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type ReviewState = typeof reviewStates.$inferSelect;
