export type Exam = { id: number; code: string; name: string };

// Same ids and codes as the Exams rows seeded on the server.
export const EXAMS: Exam[] = [
  { id: 1, code: 'YDS', name: 'YDS' },
  { id: 2, code: 'YOKDIL_FEN', name: 'YÖKDİL Fen' },
  { id: 3, code: 'YOKDIL_SAGLIK', name: 'YÖKDİL Sağlık' },
  { id: 4, code: 'YOKDIL_SOSYAL', name: 'YÖKDİL Sosyal' },
];

export function examName(id: number): string {
  return EXAMS.find((exam) => exam.id === id)?.name ?? '';
}
