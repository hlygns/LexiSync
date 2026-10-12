import { createCard } from '@/db/cards';
import { createDeck } from '@/db/decks';

type StarterDeck = { name: string; examId: number; tag: string; words: [term: string, meaning: string][] };

// A small set to try the app with. Exam ids match the server's Exams table.
const STARTER_DECKS: StarterDeck[] = [
  {
    name: 'YDS — Akademik fiiller',
    examId: 1,
    tag: 'fiil',
    words: [
      ['abandon', 'terk etmek, vazgeçmek'],
      ['acquire', 'edinmek, kazanmak'],
      ['allocate', 'tahsis etmek, ayırmak'],
      ['anticipate', 'öngörmek, beklemek'],
      ['comprise', 'içermek, oluşmak'],
      ['constitute', 'oluşturmak, teşkil etmek'],
      ['contradict', 'çelişmek, yalanlamak'],
      ['deteriorate', 'kötüleşmek, bozulmak'],
      ['diminish', 'azalmak, azaltmak'],
      ['enhance', 'artırmak, geliştirmek'],
      ['exceed', 'aşmak'],
      ['facilitate', 'kolaylaştırmak'],
      ['implement', 'uygulamak, yürürlüğe koymak'],
      ['indicate', 'göstermek, belirtmek'],
      ['maintain', 'sürdürmek; ileri sürmek'],
      ['obtain', 'elde etmek'],
      ['reveal', 'açığa çıkarmak, ortaya koymak'],
      ['sustain', 'sürdürmek, desteklemek'],
      ['undermine', 'zayıflatmak, baltalamak'],
      ['yield', 'ürün vermek; boyun eğmek'],
    ],
  },
  {
    name: 'YÖKDİL Fen — Temel terimler',
    examId: 2,
    tag: 'fen',
    words: [
      ['accelerate', 'hızlanmak, hızlandırmak'],
      ['compound', 'bileşik'],
      ['density', 'yoğunluk'],
      ['emission', 'salınım, emisyon'],
      ['friction', 'sürtünme'],
      ['hypothesis', 'hipotez, varsayım'],
      ['molecule', 'molekül'],
      ['particle', 'parçacık'],
      ['radiation', 'radyasyon, ışınım'],
      ['velocity', 'hız'],
    ],
  },
  {
    name: 'YÖKDİL Sağlık — Temel terimler',
    examId: 3,
    tag: 'sağlık',
    words: [
      ['acute', 'akut, ani başlayan'],
      ['chronic', 'kronik, süreğen'],
      ['diagnosis', 'tanı, teşhis'],
      ['dose', 'doz'],
      ['immune', 'bağışık'],
      ['infection', 'enfeksiyon'],
      ['prevalence', 'yaygınlık'],
      ['side effect', 'yan etki'],
      ['symptom', 'belirti'],
      ['treatment', 'tedavi'],
    ],
  },
  {
    name: 'YÖKDİL Sosyal — Temel terimler',
    examId: 4,
    tag: 'sosyal',
    words: [
      ['bias', 'ön yargı, yanlılık'],
      ['civilization', 'uygarlık'],
      ['democracy', 'demokrasi'],
      ['ideology', 'ideoloji'],
      ['inequality', 'eşitsizlik'],
      ['legislation', 'mevzuat, yasama'],
      ['migration', 'göç'],
      ['perception', 'algı'],
      ['policy', 'politika, ilke'],
      ['welfare', 'refah'],
    ],
  },
];

// Goes through the normal create functions, so the starter decks are synced like any other deck.
export function addStarterDecks(): void {
  for (const starter of STARTER_DECKS) {
    const deckId = createDeck({ name: starter.name, examId: starter.examId });
    for (const [term, meaning] of starter.words) {
      createCard(deckId, { term, meaning, example: '', tags: [starter.tag] });
    }
  }
}
