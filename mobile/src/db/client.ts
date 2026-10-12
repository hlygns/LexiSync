import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

// enableChangeListener lets useLiveQuery re-render a screen when its table changes.
const sqlite = openDatabaseSync('lexisync.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
