/**
 * Anti-Tampering & Integrity Security Service for YuksalQuiz
 * Protects client-side state (Coins, Streaks, Completed Tests, Unlock Statuses)
 * against manual tampering via browser devtools / localStorage inspection.
 */

const SALT = 'YUK$AL_QU!Z_SECURE_SALT_v1_2026_UZB';

/**
 * Fast synchronous cryptographic hash function (FNV-1a + bit mixing + secondary round)
 * Safe and reliable across all browsers and WebViews without external heavy libraries.
 */
function secureHash(str: string): string {
  let h1 = 0xdeadbeef ^ 0x811c9dc5;
  let h2 = 0x41c6ce57 ^ 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export interface ProtectedPayload {
  userId: string;
  coins: number;
  completedTestsCount: number;
  streak: number;
  lastLoginDate: string;
  walletBalance?: number;
  voucherBalance?: number;
}

/**
 * Generates an anti-tamper signature for sensitive progression data.
 */
export function generateIntegritySignature(payload: ProtectedPayload): string {
  const serialized = `${payload.userId}|${payload.coins}|${payload.completedTestsCount}|${payload.streak}|${payload.lastLoginDate}|${payload.walletBalance || 0}|${payload.voucherBalance || 0}|${SALT}`;
  return secureHash(serialized);
}

/**
 * Verifies whether stored state matches the computed signature.
 * Returns true if untampered, false if manipulated.
 */
export function verifyIntegritySignature(payload: ProtectedPayload, storedSignature?: string): boolean {
  if (!storedSignature) return false;
  const expected = generateIntegritySignature(payload);
  return expected === storedSignature;
}

/**
 * Obfuscates sensitive data (e.g. private test passwords or answers)
 */
export function obfuscateData(data: string): string {
  return btoa(
    encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Deobfuscates sensitive data
 */
export function deobfuscateData(encoded: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(encoded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return '';
  }
}
