import { randomUUID } from 'crypto';

const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;

if (!globalCrypto) {
  (globalThis as { crypto?: { randomUUID?: () => string } }).crypto = { randomUUID };
} else if (!globalCrypto.randomUUID) {
  globalCrypto.randomUUID = randomUUID;
}
