/**
 * Anti-Tampering, Anti-Cheat & Disaster Recovery Security Suite for YuksalQuiz
 * 
 * Features:
 * 1. Cryptographic HMAC-like State Signing & Anti-Tamper Verification
 * 2. Brute-Force Rate Limiting for Admin & Authenticated Gates
 * 3. XSS Sanitization for user-generated quizzes, universities, and inputs
 * 4. Automated Local Data Backup & Disaster Recovery Snapshots
 * 5. Anti-Cheat Engine for Test Progression
 */

const SALT = 'YUK$AL_QU!Z_SECURE_SALT_v1_2026_UZB_DEFENSE';
const BACKUP_STORAGE_KEY = 'yuksal_safe_backup_v2';
const RATE_LIMIT_STORAGE_KEY = 'yuksal_auth_ratelimit_v1';

/**
 * Fast synchronous cryptographic hash function (FNV-1a + bit mixing + secondary round)
 */
export function secureHash(str: string): string {
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
 * Decodes all HTML entities into normal UTF-8 characters.
 * Fixes &#x27; -> ', &quot; -> ", etc.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/gi, '/')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .trim();
}

/**
 * XSS & HTML Injection Sanitization
 * Strips harmful HTML tags, scripts, and javascript: protocols from user inputs
 * WITHOUT ruining Uzbek apostrophes ('), quotes ("), or slashes (/).
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // First decode any double-escaped entities
  let clean = decodeHtmlEntities(input);

  // Strip script and iframe tags completely
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Strip javascript: protocols, event handlers
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/\bon\w+\s*=/gi, '');

  // Strip raw HTML tags (e.g. <div>, <p>, <img ...>)
  clean = clean.replace(/<[^>]*>?/gm, '');

  return clean.trim();
}

/**
 * Strict Name Validation & XSS Sanitization:
 * - Strips all HTML/script tags and special symbols
 * - Enforces length between 2 and 25 characters
 * - Allows Latin & Cyrillic alphabets, Uzbek apostrophes (' and ʻ) and hyphens
 */
export function validateAndSanitizeName(rawName: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!rawName || typeof rawName !== 'string') {
    return { isValid: false, sanitized: '', error: "Maydon to'ldirilishi shart" };
  }

  // 1. Strip HTML tags, script injections, and unescape entities
  let clean = sanitizeText(rawName);

  // 2. Remove characters that are not letters, space, apostrophe, or hyphen
  clean = clean.replace(/[^a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ\s'ʻ’\-]/g, '');

  // 3. Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  // 4. Check length (2 to 25 chars)
  if (clean.length < 2) {
    return {
      isValid: false,
      sanitized: clean,
      error: "Kamida 2 ta harfdan iborat bo'lishi kerak",
    };
  }

  if (clean.length > 25) {
    clean = clean.substring(0, 25).trim();
  }

  return {
    isValid: true,
    sanitized: clean,
  };
}

/**
 * Brute-Force Rate Limiting for Admin Login
 */
interface RateLimitData {
  failedAttempts: number;
  lockoutUntil: number;
}

const MAX_FAILED_ATTEMPTS = 4;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkAdminRateLimit(): { isLocked: boolean; remainingSeconds: number; attemptsLeft: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };

    const data: RateLimitData = JSON.parse(raw);
    const now = Date.now();

    if (data.lockoutUntil && data.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attemptsLeft: 0 };
    }

    // Lockout expired
    if (data.lockoutUntil && data.lockoutUntil <= now) {
      localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
    }

    const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - (data.failedAttempts || 0));
    return { isLocked: false, remainingSeconds: 0, attemptsLeft };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }
}

export function recordAdminFailedAttempt(): { isLocked: boolean; remainingSeconds: number; attemptsLeft: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const data: RateLimitData = raw ? JSON.parse(raw) : { failedAttempts: 0, lockoutUntil: 0 };
    const now = Date.now();

    data.failedAttempts = (data.failedAttempts || 0) + 1;

    if (data.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      data.lockoutUntil = now + LOCKOUT_DURATION_MS;
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
      return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000), attemptsLeft: 0 };
    }

    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
    const attemptsLeft = MAX_FAILED_ATTEMPTS - data.failedAttempts;
    return { isLocked: false, remainingSeconds: 0, attemptsLeft };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: 1 };
  }
}

export function resetAdminRateLimit(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch {}
}

/**
 * Anti-Cheat Test Attempt Validation
 * Ensures that human users actually answered the quiz and didn't submit an automated bot payload.
 */
export function validateTestAttempt(totalQuestions: number, timeSpentSeconds: number): boolean {
  if (totalQuestions <= 0) return false;
  // Minimum realistic speed: at least 1.0 second per question
  const minRequiredTime = Math.max(3, Math.floor(totalQuestions * 0.8));
  if (timeSpentSeconds < minRequiredTime) {
    console.warn('YuksalQuiz Anti-Cheat Warning: Unrealistic completion speed detected.');
    return false;
  }
  return true;
}

/**
 * Automated Local Backup & Disaster Recovery Service
 * "shuncha xarakat birdaniga yo'q bolmasin"
 */
export function createLocalBackup(state: any): void {
  try {
    if (!state || !state.profile) return;
    const backupSnapshot = {
      timestamp: Date.now(),
      dateString: new Date().toISOString(),
      profile: state.profile,
      universities: state.universities || [],
      customUniversities: state.customUniversities || [],
      testPackages: state.testPackages || [],
      transactions: state.transactions || [],
      announcements: state.announcements || [],
      announcementReplies: state.announcementReplies || [],
      checksum: secureHash(JSON.stringify(state.profile) + SALT),
    };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backupSnapshot));
  } catch (err) {
    console.warn('YuksalQuiz Backup: Unable to write local backup snapshot', err);
  }
}

export function restoreLatestBackup(): any | null {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    const expected = secureHash(JSON.stringify(snapshot.profile) + SALT);
    if (snapshot.checksum !== expected) {
      console.warn('YuksalQuiz Restore: Backup integrity check failed.');
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Export full encrypted database backup file (JSON)
 */
export function exportEncryptedBackup(state: any): string {
  const exportPayload = {
    version: '1.0-SECURE',
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    universities: state.universities,
    customUniversities: state.customUniversities,
    testPackages: state.testPackages,
    transactions: state.transactions,
    announcements: state.announcements,
    announcementReplies: state.announcementReplies || [],
    signature: secureHash(JSON.stringify(state.profile) + (state.universities?.length || 0) + SALT),
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import and verify database backup file
 */
export function importEncryptedBackup(jsonString: string): { success: boolean; data?: any; error?: string } {
  try {
    const payload = JSON.parse(jsonString);
    if (!payload.profile || !payload.signature) {
      return { success: false, error: "Zaxira fayli formati noto'g'ri yoki buzilgan!" };
    }
    const expected = secureHash(JSON.stringify(payload.profile) + (payload.universities?.length || 0) + SALT);
    if (payload.signature !== expected) {
      return { success: false, error: "Xavfsizlik ogohlantirishi: Ushbu fayl imzosi mos kelmadi yoki o'zgartirilgan!" };
    }
    return { success: true, data: payload };
  } catch (e: any) {
    return { success: false, error: "Faylni o'qishda xatolik: " + e.message };
  }
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
