import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

// enableChangeListener lets useLiveQuery re-render a screen when its table changes.
const sqlite = openDatabaseSync('lexisync.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

// The handle passed to the callback of db.transaction(...).
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
