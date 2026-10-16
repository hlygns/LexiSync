import { normalizeDate, shouldApplyRemote } from './merge';

const earlier = '2026-10-12T09:00:00.000Z';
const later = '2026-10-12T09:05:00.000Z';

describe('shouldApplyRemote', () => {
  test('a row that does not exist locally is taken', () => {
    expect(shouldApplyRemote(undefined, { updatedAt: earlier, deletedAt: null })).toBe(true);
  });

  test('a newer remote edit replaces the local row', () => {
    expect(shouldApplyRemote({ updatedAt: earlier, deletedAt: null }, { updatedAt: later, deletedAt: null })).toBe(true);
  });

  test('an older remote edit does not replace a newer local edit', () => {
    expect(shouldApplyRemote({ updatedAt: later, deletedAt: null }, { updatedAt: earlier, deletedAt: null })).toBe(false);
  });

  test('a remote delete wins even over a newer local edit', () => {
    expect(shouldApplyRemote({ updatedAt: later, deletedAt: null }, { updatedAt: earlier, deletedAt: earlier })).toBe(true);
  });

  test('a local delete is not undone by a newer remote edit', () => {
    expect(shouldApplyRemote({ updatedAt: earlier, deletedAt: earlier }, { updatedAt: later, deletedAt: null })).toBe(false);
  });

  test('the same instant in server and device format counts as equal, so the echo of our own push is applied', () => {
    const local = { updatedAt: '2026-10-12T09:00:00.123Z', deletedAt: null };
    const remote = { updatedAt: '2026-10-12T09:00:00.123+00:00', deletedAt: null };

    expect(shouldApplyRemote(local, remote)).toBe(true);
  });

  test('dates are compared as instants, not as text', () => {
    // As text "12:00+03:00" sorts after "09:30Z", but it is the earlier instant (09:00Z).
    const local = { updatedAt: '2026-10-12T09:30:00.000Z', deletedAt: null };
    const remote = { updatedAt: '2026-10-12T12:00:00+03:00', deletedAt: null };

    expect(shouldApplyRemote(local, remote)).toBe(false);
  });
});

describe('normalizeDate', () => {
  test('converts the server format to the device format', () => {
    expect(normalizeDate('2026-10-12T09:00:00.123456+00:00')).toBe('2026-10-12T09:00:00.123Z');
    expect(normalizeDate('2026-10-12T12:00:00+03:00')).toBe('2026-10-12T09:00:00.000Z');
  });

  test('keeps null', () => {
    expect(normalizeDate(null)).toBeNull();
  });
});

describe('normalizeApiUrl', () => {
  const { normalizeApiUrl } = require('@/api/url') as typeof import('@/api/url');

  test('a bare IP address gets http and the API port', () => {
    expect(normalizeApiUrl(' 192.168.1.49 ')).toBe('http://192.168.1.49:8080');
  });

  test('an address with a port keeps that port', () => {
    expect(normalizeApiUrl('192.168.1.49:5000')).toBe('http://192.168.1.49:5000');
  });

  test('a full https address is kept, without the trailing slash', () => {
    expect(normalizeApiUrl('https://lexisync.example.com/')).toBe('https://lexisync.example.com');
  });
});
