import { UserProfile, TestAttempt } from '../types';

/**
 * Paywall and Daily Test Limits Service
 * 
 * Rules:
 * 1. If user.has_paid === true (or has active subscription) -> Unlimited access.
 * 2. If free user -> Maximum 2 free attempts per test per day.
 * 3. 3rd attempt is blocked and prompts Paywall modal.
 */

export const DAILY_FREE_TEST_LIMIT = 2;

const STORAGE_PREFIX = 'yuksal_daily_attempts_';

/**
 * Formats current date as 'YYYY-MM-DD' based on local timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether user has an active paid account or subscription
 */
export function isPaidUser(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.isSubscribed === true) return true;
  if (profile.has_paid === true) return true;
  if (profile.subscriptionEnd && new Date(profile.subscriptionEnd) > new Date()) return true;
  if (profile.paid_until && new Date(profile.paid_until) > new Date()) return true;
  if (
    profile.subscriptionPlan &&
    profile.subscriptionPlan !== 'none' &&
    (!profile.subscriptionExpiry || new Date(profile.subscriptionExpiry) > new Date())
  ) {
    return true;
  }
  return false;
}

/**
 * Generates test key for tracking
 */
export function getTestKey(pkgId: string, blockId?: string): string {
  if (blockId && blockId.trim()) {
    return `${pkgId}_${blockId}`;
  }
  return pkgId;
}

/**
 * Reads local storage daily attempts record for a specific date
 */
function getLocalDailyAttempts(todayStr: string): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${todayStr}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse local daily attempts:', err);
  }
  return {};
}

/**
 * Saves local storage daily attempts record for a specific date
 */
function saveLocalDailyAttempts(todayStr: string, data: Record<string, number>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${todayStr}`, JSON.stringify(data));
    cleanOldDailyAttempts(todayStr);
  } catch (err) {
    console.warn('Failed to save local daily attempts:', err);
  }
}

/**
 * Cleans up old days' entries from localStorage to keep storage clean
 */
function cleanOldDailyAttempts(todayStr: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX) && k !== `${STORAGE_PREFIX}${todayStr}`) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (err) {
    // Non-critical cleanup error
  }
}

/**
 * Computes how many times this specific test/block has been attempted today
 * cross-referencing localStorage with store testAttempts (and test_results)
 */
export function getTodayAttemptsCount(
  pkgId: string,
  blockId?: string,
  testAttempts?: TestAttempt[]
): number {
  const today = getTodayDateString();
  const testKey = getTestKey(pkgId, blockId);
  const localMap = getLocalDailyAttempts(today);

  // Started count from localStorage
  const localCount = localMap[testKey] ?? localMap[pkgId] ?? 0;

  // Completed count from testAttempts
  let completedCount = 0;
  if (testAttempts && Array.isArray(testAttempts)) {
    completedCount = testAttempts.filter((att) => {
      if (att.testPackageId !== pkgId) return false;
      if (blockId && att.blockId && att.blockId !== blockId) return false;
      const attDate = (att.completedAt || '').slice(0, 10);
      return attDate === today;
    }).length;
  }

  return Math.max(localCount, completedCount);
}

export interface CanStartTestResult {
  allowed: boolean;
  isPaid: boolean;
  todayCount: number;
  maxLimit: number;
  remaining: number;
}

/**
 * Evaluates whether user is allowed to start the specified test
 */
export function canUserStartTest(
  profile: UserProfile | undefined | null,
  pkgId: string,
  blockId?: string,
  testAttempts?: TestAttempt[]
): CanStartTestResult {
  if (isPaidUser(profile)) {
    return {
      allowed: true,
      isPaid: true,
      todayCount: 0,
      maxLimit: DAILY_FREE_TEST_LIMIT,
      remaining: Infinity,
    };
  }

  const todayCount = getTodayAttemptsCount(pkgId, blockId, testAttempts);
  const allowed = todayCount < DAILY_FREE_TEST_LIMIT;
  const remaining = Math.max(0, DAILY_FREE_TEST_LIMIT - todayCount);

  return {
    allowed,
    isPaid: false,
    todayCount,
    maxLimit: DAILY_FREE_TEST_LIMIT,
    remaining,
  };
}

/**
 * Records test start and increments daily attempt counter in localStorage
 */
export function recordTestStartAttempt(
  pkgId: string,
  blockId?: string,
  testAttempts?: TestAttempt[]
): number {
  const today = getTodayDateString();
  const testKey = getTestKey(pkgId, blockId);
  const currentCount = getTodayAttemptsCount(pkgId, blockId, testAttempts);
  const nextCount = currentCount + 1;

  const localMap = getLocalDailyAttempts(today);
  localMap[testKey] = nextCount;
  if (blockId) {
    // Also mark package level if only 1 block or general package check
    localMap[pkgId] = Math.max(localMap[pkgId] || 0, nextCount);
  }

  saveLocalDailyAttempts(today, localMap);
  return nextCount;
}
