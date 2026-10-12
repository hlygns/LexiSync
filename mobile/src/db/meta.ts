import { eq } from 'drizzle-orm';

import { db, type Tx } from '@/db/client';
import { syncMeta } from '@/db/schema';
import { uuidv7 } from '@/db/uuid';

export function getMeta(key: string, executor: Tx | typeof db = db): string | null {
  return executor.select().from(syncMeta).where(eq(syncMeta.key, key)).get()?.value ?? null;
}

export function setMeta(key: string, value: string, executor: Tx | typeof db = db): void {
  executor
    .insert(syncMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value } })
    .run();
}

// Identifies this installation in review logs. Created once, on first use.
export function getDeviceId(): string {
  let deviceId = getMeta('deviceId');
  if (!deviceId) {
    deviceId = uuidv7();
    setMeta('deviceId', deviceId);
  }
  return deviceId;
}
