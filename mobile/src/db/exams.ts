import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { exams } from '@/db/schema';

export type Exam = { id: number; code: string; name: string };

// Used only until the first sync has stored the server's list (GET /exams) on the device.
const FALLBACK_EXAMS: Exam[] = [
  { id: 1, code: 'YDS', name: 'YDS' },
  { id: 2, code: 'YOKDIL_FEN', name: 'YÖKDİL Fen Bilimleri' },
  { id: 3, code: 'YOKDIL_SAGLIK', name: 'YÖKDİL Sağlık Bilimleri' },
  { id: 4, code: 'YOKDIL_SOSYAL', name: 'YÖKDİL Sosyal Bilimler' },
];

// The exam list comes from the local copy of the server's table: a new exam added on the
// server shows up after the next sync, without an app update.
export function useExams(): Exam[] {
  const { data } = useLiveQuery(db.select().from(exams).orderBy(asc(exams.id)));
  return data.length > 0 ? data : FALLBACK_EXAMS;
}
