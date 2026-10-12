/**
 * End-to-end test of the sync engine: the real engine code and a real SQLite database per device,
 * talking to the real API. Needs the backend running (docker compose up), so it is not part of
 * "npm test"; run it with "npm run test:e2e".
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
process.env.EXPO_PUBLIC_API_URL = API_URL;

// The phone's native modules, replaced by Node equivalents. Every "device" gets its own copies.
jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) => new Uint8Array(require('crypto').randomBytes(count)),
}));
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void store.set(key, value),
    deleteItemAsync: async (key: string) => void store.delete(key),
  };
});
jest.mock('@/db/client', () => {
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const fs = require('fs');
  const path = require('path');

  // Same migration files the app runs on the phone.
  const sqlite = new Database(':memory:');
  const dir = path.join(__dirname, '../../drizzle');
  for (const file of fs.readdirSync(dir).filter((name: string) => name.endsWith('.sql')).sort()) {
    for (const statement of fs.readFileSync(path.join(dir, file), 'utf8').split('--> statement-breakpoint')) {
      sqlite.exec(statement);
    }
  }
  return { db: drizzle(sqlite, { schema: require('@/db/schema') }) };
});

// Network switch for the whole process: "offline" fails every request before it is sent,
// "loseResponses" lets the request reach the server and then drops the answer.
let network: 'online' | 'offline' | 'loseResponses' = 'online';

// The Jest preset for React Native stubs out fetch, so real requests go through Node's http module.
// Only the parts of the fetch API that the app uses are provided.
const realFetch = ((url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
  new Promise((resolve, reject) => {
    const req = (require('http') as typeof import('http')).request(
      url,
      { method: init.method ?? 'GET', headers: init.headers },
      (res) => {
        let text = '';
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          resolve({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(text) });
        });
      },
    );
    req.on('error', () => reject(new TypeError('Network request failed')));
    req.end(init.body);
  })) as unknown as typeof fetch;
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = (async (...args: Parameters<typeof fetch>) => {
    if (network === 'offline') throw new TypeError('Network request failed');
    const response = await realFetch(...args);
    if (network === 'loseResponses' && String(args[0]).includes('/sync/push')) {
      throw new TypeError('Network request failed');
    }
    return response;
  }) as typeof fetch;
});
afterAll(() => {
  global.fetch = originalFetch;
});
beforeEach(() => {
  network = 'online';
});

type Device = ReturnType<typeof loadModules>;

function loadModules() {
  return {
    engine: require('@/sync/engine') as typeof import('@/sync/engine'),
    session: require('@/auth/session') as typeof import('@/auth/session'),
    decks: require('@/db/decks') as typeof import('@/db/decks'),
    cards: require('@/db/cards') as typeof import('@/db/cards'),
    reviews: require('@/db/reviews') as typeof import('@/db/reviews'),
    schema: require('@/db/schema') as typeof import('@/db/schema'),
    db: (require('@/db/client') as typeof import('@/db/client')).db,
  };
}

// A fresh copy of every module = a separate device with its own database, outbox and session.
function newDevice(): Device {
  let device!: Device;
  jest.isolateModules(() => {
    device = loadModules();
  });
  return device;
}

async function api<T>(pathname: string, body: unknown): Promise<T> {
  const response = await realFetch(`${API_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${pathname} -> ${response.status}`);
  return (await response.json()) as T;
}

type Tokens = { accessToken: string; accessTokenExpiresAt: string; refreshToken: string };
const PASSWORD = 'parola12345';

async function signIn(device: Device, email: string, mode: 'register' | 'login'): Promise<void> {
  const tokens = await api<Tokens>(`/auth/${mode}`, { email, password: PASSWORD });
  device.engine.claimLocalData(email);
  await device.session.saveSession({ email, ...tokens });
}

// A phone and a tablet signed in to the same brand-new account.
async function twoDevices(): Promise<{ phone: Device; tablet: Device; email: string }> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const phone = newDevice();
  const tablet = newDevice();
  await signIn(phone, email, 'register');
  await signIn(tablet, email, 'login');
  return { phone, tablet, email };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const input = (term: string, meaning: string) => ({ term, meaning, example: '', tags: ['e2e'] });

function liveCards(device: Device) {
  return device.db
    .select()
    .from(device.schema.cards)
    .all()
    .filter((card) => card.deletedAt === null)
    .map((card) => `${card.term}=${card.meaning}`)
    .sort();
}
const outboxSize = (device: Device) => device.db.select().from(device.schema.outbox).all().length;

let serverIsUp = false;
beforeAll(async () => {
  try {
    serverIsUp = (await realFetch(`${API_URL}/health`)).ok;
  } catch {
    serverIsUp = false;
  }
  if (!serverIsUp) {
    throw new Error(`The API is not reachable at ${API_URL}. Start it with "docker compose up -d".`);
  }
});

jest.setTimeout(60_000);

test('work done offline on one device appears on the other after both sync', async () => {
  const { phone, tablet } = await twoDevices();

  network = 'offline';
  const deckId = phone.decks.createDeck({ name: 'Uçak modunda', examId: 1 });
  phone.cards.createCard(deckId, input('abandon', 'terk etmek'));
  phone.cards.createCard(deckId, input('acquire', 'edinmek'));
  await phone.engine.requestSync();

  expect(phone.engine.getSyncStatus().state).toBe('offline');
  expect(outboxSize(phone)).toBe(3);
  expect(liveCards(phone)).toHaveLength(2); // usable locally the whole time

  network = 'online';
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  expect(outboxSize(phone)).toBe(0);
  expect(phone.engine.getSyncStatus().state).toBe('idle');
  expect(tablet.db.select().from(tablet.schema.decks).all().map((deck) => deck.name)).toEqual(['Uçak modunda']);
  expect(liveCards(tablet)).toEqual(['abandon=terk etmek', 'acquire=edinmek']);
});

test('both devices edit the same card offline and converge on the later edit', async () => {
  const { phone, tablet } = await twoDevices();
  const deckId = phone.decks.createDeck({ name: 'Çakışma', examId: 1 });
  const cardId = phone.cards.createCard(deckId, input('yield', 'ilk anlam'));
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  phone.cards.updateCard(cardId, input('yield', 'telefonda yazılan'));
  await sleep(20);
  tablet.cards.updateCard(cardId, input('yield', 'tablette yazılan')); // later, so it must win

  // The later edit reaches the server first; the earlier one arrives afterwards and must lose.
  await tablet.engine.requestSync();
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  expect(liveCards(phone)).toEqual(['yield=tablette yazılan']);
  expect(liveCards(tablet)).toEqual(['yield=tablette yazılan']);
  expect(outboxSize(phone)).toBe(0);
});

test('a delete on one device wins over a later edit on the other', async () => {
  const { phone, tablet } = await twoDevices();
  const deckId = phone.decks.createDeck({ name: 'Silme', examId: 1 });
  const cardId = phone.cards.createCard(deckId, input('reveal', 'açığa çıkarmak'));
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  phone.cards.deleteCard(cardId);
  await sleep(20);
  tablet.cards.updateCard(cardId, input('reveal', 'silindikten sonra düzenlendi'));

  await tablet.engine.requestSync();
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  expect(liveCards(phone)).toEqual([]);
  expect(liveCards(tablet)).toEqual([]);
});

test('deleting a deck removes its cards on the other device, including one added there meanwhile', async () => {
  const { phone, tablet } = await twoDevices();
  const deckId = phone.decks.createDeck({ name: 'Silinecek deste', examId: 1 });
  phone.cards.createCard(deckId, input('one', 'bir'));
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  tablet.cards.createCard(deckId, input('two', 'iki')); // tablet does not know yet
  phone.decks.deleteDeck(deckId);

  await phone.engine.requestSync();
  await tablet.engine.requestSync();
  await tablet.engine.requestSync();
  await phone.engine.requestSync();

  expect(liveCards(tablet)).toEqual([]);
  expect(liveCards(phone)).toEqual([]);
  expect(tablet.db.select().from(tablet.schema.decks).all()[0].deletedAt).not.toBeNull();
});

test('reviews made on two devices are merged and both compute the same schedule', async () => {
  const { phone, tablet } = await twoDevices();
  const deckId = phone.decks.createDeck({ name: 'Tekrar', examId: 1 });
  const cardId = phone.cards.createCard(deckId, input('sustain', 'sürdürmek'));
  await phone.engine.requestSync();
  await tablet.engine.requestSync();

  // Good on the phone, Good on the tablet a day later, Hard on the phone a week later: all offline.
  const day = new Date('2026-10-01T09:00:00.000Z');
  const plusDays = (days: number) => new Date(day.getTime() + days * 86_400_000);
  phone.reviews.recordReview(cardId, 4, day);
  tablet.reviews.recordReview(cardId, 4, plusDays(1));
  phone.reviews.recordReview(cardId, 3, plusDays(7));

  await phone.engine.requestSync();
  await tablet.engine.requestSync();
  await phone.engine.requestSync();

  const stateOn = (device: Device) => device.db.select().from(device.schema.reviewStates).all();
  const logsOn = (device: Device) => device.db.select().from(device.schema.reviewLogs).all().length;

  expect(logsOn(phone)).toBe(3);
  expect(logsOn(tablet)).toBe(3);
  expect(stateOn(phone)).toEqual(stateOn(tablet));
  // Good, Good, Hard replayed in time order: 3 repetitions, 6 * 2.5 = 15 days after the last review.
  expect(stateOn(phone)[0]).toMatchObject({ repetitions: 3, intervalDays: 15, dueAt: plusDays(22).toISOString() });
  expect(stateOn(phone)[0].easeFactor).toBeCloseTo(2.36, 10);
});

test('a push whose answer is lost is sent again and applied only once', async () => {
  const { phone, tablet } = await twoDevices();

  network = 'loseResponses';
  const deckId = phone.decks.createDeck({ name: 'Cevap kayboldu', examId: 1 });
  phone.cards.createCard(deckId, input('exceed', 'aşmak'));
  await phone.engine.requestSync();

  // The server has the data, but the phone cannot know that: the outbox is untouched.
  expect(outboxSize(phone)).toBe(2);

  network = 'online';
  await phone.engine.requestSync(); // same changeIds again
  await tablet.engine.requestSync();

  expect(outboxSize(phone)).toBe(0);
  expect(tablet.db.select().from(tablet.schema.decks).all()).toHaveLength(1);
  expect(liveCards(tablet)).toEqual(['exceed=aşmak']);
});

test('signing out wipes the device and signing in again restores everything from the server', async () => {
  const { phone, email } = await twoDevices();
  const deckId = phone.decks.createDeck({ name: 'Geri gelecek', examId: 1 });
  const cardId = phone.cards.createCard(deckId, input('obtain', 'elde etmek'));
  phone.reviews.recordReview(cardId, 5);
  await phone.engine.requestSync();
  const stateBefore = phone.db.select().from(phone.schema.reviewStates).all();

  phone.engine.wipeLocalData();
  await phone.session.clearSession();
  expect(liveCards(phone)).toEqual([]);
  expect(phone.db.select().from(phone.schema.reviewStates).all()).toEqual([]);

  await signIn(phone, email, 'login');
  await phone.engine.requestSync();

  expect(liveCards(phone)).toEqual(['obtain=elde etmek']);
  expect(phone.db.select().from(phone.schema.reviewStates).all()).toEqual(stateBefore);
});

test('data left on the device by another account is not sent to the new account', async () => {
  const first = await twoDevices();
  const phone = first.phone;
  network = 'offline';
  const deckId = phone.decks.createDeck({ name: 'Başkasının destesi', examId: 1 });
  phone.cards.createCard(deckId, input('private', 'özel'));
  // The first user's session expires; the app drops the session but keeps the unsent data.
  await phone.session.clearSession();
  network = 'online';

  const otherEmail = `e2e-other-${Date.now()}@example.com`;
  await signIn(phone, otherEmail, 'register');
  await phone.engine.requestSync();

  expect(liveCards(phone)).toEqual([]);
  expect(outboxSize(phone)).toBe(0);
  const second = newDevice();
  await signIn(second, otherEmail, 'login');
  await second.engine.requestSync();
  expect(second.db.select().from(second.schema.decks).all()).toEqual([]);
});

test('the exam list is copied from the server', async () => {
  const { phone } = await twoDevices();

  await phone.engine.requestSync();

  expect(phone.db.select().from(phone.schema.exams).all().map((exam) => exam.code)).toEqual([
    'YDS',
    'YOKDIL_FEN',
    'YOKDIL_SAGLIK',
    'YOKDIL_SOSYAL',
  ]);
});
