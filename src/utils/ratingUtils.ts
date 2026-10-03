import { TestAttempt, LeaderboardUser } from '../types';

export interface UserRatingStats {
  scorePoints: number;              // Total rating points (sum of latest attempt score * 4 per unique test block)
  totalCorrectAnswers: number;     // Total correct answers across latest block attempts
  totalQuestionsAttempted: number; // Total questions across latest block attempts
  accuracyPercentage: number;      // Accuracy % across latest block attempts
  uniqueBlocksCount: number;       // Number of unique blocks completed
  bestTimeSeconds: number;         // Fastest completion time in seconds
  bestTimeFormatted: string;       // Formatted mm:ss
  totalTimeSpentSeconds: number;   // Cumulative time spent solving tests in seconds
  totalTimeSpentFormatted: string; // Formatted mm:ss or hh:mm:ss
}

/**
 * Computes user's official rating points and statistics.
 *
 * Rules:
 * 1. Each correct answer awards 4 points (bal).
 * 2. Only the LATEST attempt for each unique test block (testPackageId + blockId/blockTitle) is counted.
 * 3. Retaking a block with a higher score replaces the block's score (e.g. 18 -> 20 adds +8 bal).
 * 4. Retaking a block with a lower score replaces the block's score (e.g. 20 -> 18 deducts -8 bal).
 * 5. Solving Part 1 (25/25) gives 100 points. Solving Part 2 (25/25) gives another 100 points, totaling 200 points.
 * 6. Solving all 4 parts of a 100-question test (25/25 on each) awards 400 points max.
 */
export function calculateUserRatingStats(testAttempts: TestAttempt[]): UserRatingStats {
  if (!testAttempts || testAttempts.length === 0) {
    return {
      scorePoints: 0,
      totalCorrectAnswers: 0,
      totalQuestionsAttempted: 0,
      accuracyPercentage: 0,
      uniqueBlocksCount: 0,
      bestTimeSeconds: 165,
      bestTimeFormatted: '02:45',
      totalTimeSpentSeconds: 0,
      totalTimeSpentFormatted: '00:00',
    };
  }

  // Sort by completedAt descending (newest first)
  const sortedAttempts = [...testAttempts].sort((a, b) => {
    const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return timeB - timeA;
  });

  // Group by unique test package + block: keep only the newest (first encountered in sorted list)
  const latestBlockMap = new Map<string, TestAttempt>();
  for (const att of sortedAttempts) {
    const key = `${att.testPackageId}_${att.blockId || att.blockTitle}`;
    if (!latestBlockMap.has(key)) {
      latestBlockMap.set(key, att);
    }
  }

  const latestAttempts = Array.from(latestBlockMap.values());
  const totalCorrectAnswers = latestAttempts.reduce((sum, att) => sum + (att.score || 0), 0);
  const scorePoints = totalCorrectAnswers * 4;
  const totalQuestionsAttempted = latestAttempts.reduce((sum, att) => sum + (att.totalQuestions || 0), 0);
  const accuracyPercentage =
    totalQuestionsAttempted > 0
      ? Math.round((totalCorrectAnswers / totalQuestionsAttempted) * 100)
      : 80;

  const validTimes = testAttempts.filter((a) => a.timeSpentSeconds > 0);
  const bestTimeSeconds =
    validTimes.length > 0
      ? Math.min(...validTimes.map((a) => a.timeSpentSeconds))
      : 165;

  const mins = Math.floor(bestTimeSeconds / 60);
  const secs = bestTimeSeconds % 60;
  const bestTimeFormatted = `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;

  const totalTimeSpentSeconds = testAttempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);
  const totalHours = Math.floor(totalTimeSpentSeconds / 3600);
  const totalMins = Math.floor((totalTimeSpentSeconds % 3600) / 60);
  const totalSecs = totalTimeSpentSeconds % 60;
  const totalTimeSpentFormatted =
    totalHours > 0
      ? `${totalHours.toString().padStart(2, '0')}:${totalMins.toString().padStart(2, '0')}:${totalSecs.toString().padStart(2, '0')}`
      : `${totalMins.toString().padStart(2, '0')}:${totalSecs.toString().padStart(2, '0')}`;

  return {
    scorePoints,
    totalCorrectAnswers,
    totalQuestionsAttempted,
    accuracyPercentage,
    uniqueBlocksCount: latestAttempts.length,
    bestTimeSeconds,
    bestTimeFormatted,
    totalTimeSpentSeconds,
    totalTimeSpentFormatted: totalTimeSpentSeconds > 0 ? totalTimeSpentFormatted : bestTimeFormatted,
  };
}

/**
 * Compares two leaderboard users according to official ranking rules.
 *
 * Rules:
 * 1. Primary sort: Score points (each correct answer awards 4 points) / Total correct answers count.
 * 2. Tie-breaker: If score points / correct answers are equal, the user who spent LESS total time ranks higher.
 * 3. Fallback tie-breaker: User with faster bestTimeSeconds ranks higher.
 * 4. Deterministic order: Alphabetical comparison on ID.
 */
export function compareLeaderboardUsers(
  a: LeaderboardUser,
  b: LeaderboardUser,
  metric: 'correct' | 'percentage' | 'weekly' = 'correct'
): number {
  if (metric === 'correct') {
    const aPoints =
      a.scorePoints ??
      (a.correctAnswersCount !== undefined
        ? a.correctAnswersCount * 4
        : (a.testsCompleted || 0) * 22 * 4);
    const bPoints =
      b.scorePoints ??
      (b.correctAnswersCount !== undefined
        ? b.correctAnswersCount * 4
        : (b.testsCompleted || 0) * 22 * 4);

    if (bPoints !== aPoints) {
      return bPoints - aPoints; // Highest score points first
    }

    // Tie-breaker: Lower total time spent ranks higher!
    const aTime =
      a.totalTimeSpentSeconds && a.totalTimeSpentSeconds > 0
        ? a.totalTimeSpentSeconds
        : a.bestTimeSeconds || 180;
    const bTime =
      b.totalTimeSpentSeconds && b.totalTimeSpentSeconds > 0
        ? b.totalTimeSpentSeconds
        : b.bestTimeSeconds || 180;

    if (aTime !== bTime) {
      return aTime - bTime; // Lower total time is better
    }

    return (a.id || '').localeCompare(b.id || '');
  }

  if (metric === 'percentage') {
    const aAcc = a.accuracyPercentage ?? 80;
    const bAcc = b.accuracyPercentage ?? 80;
    if (bAcc !== aAcc) return bAcc - aAcc;

    const aTime = a.bestTimeSeconds || 180;
    const bTime = b.bestTimeSeconds || 180;
    if (aTime !== bTime) return aTime - bTime;

    const aPoints = a.scorePoints ?? 0;
    const bPoints = b.scorePoints ?? 0;
    return bPoints - aPoints;
  }

  // Weekly active hours
  return (b.weeklyActiveHours || 0) - (a.weeklyActiveHours || 0);
}
