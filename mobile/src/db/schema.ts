import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export type Deck = typeof decks.$inferSelect;
export type Card = typeof cards.$inferSelect;
