import * as Crypto from 'expo-crypto';

// UUID v7: the first 48 bits are the current time in milliseconds, the rest is random.
// Ids created later sort later, which keeps database indexes compact, and no server is needed to create one.
export function uuidv7(now: number = Date.now()): string {
  const bytes = Crypto.getRandomBytes(16);

  // Write the timestamp big-endian into bytes 0-5. Division instead of >> because the value exceeds 32 bits.
  for (let i = 0; i < 6; i++) {
    bytes[i] = Math.floor(now / 2 ** (8 * (5 - i))) % 256;
  }

  bytes[6] = 0x70 | (bytes[6] & 0x0f); // version 7
  bytes[8] = 0x80 | (bytes[8] & 0x3f); // RFC variant

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
