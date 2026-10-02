import React, { useState, useMemo } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Trophy,
  Crown,
  Clock,
  CheckCircle2,
  MapPin,
  Sparkles,
  School,
  Building2,
  Percent,
  Zap,
  Users,
} from 'lucide-react';
import { LeaderboardUser, UniversityLeaderboardEntry, LeaderboardScope } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { UserAvatar } from './UserAvatar';
import { DEFAULT_AVATAR } from '../constants/avatars';
import { INITIAL_UNIVERSITY_LEADERBOARD } from '../data/mockLeaderboard';
import { calculateUserRatingStats } from '../utils/ratingUtils';

export const Leaderboard: React.FC = () => {
  const { leaderboard, profile, testAttempts, leaderboardScope, setLeaderboardScope, universities } = useQuizStore();
  const { t } = useTranslation();

  // Metric filter: 'correct' (Reyting ballari) | 'percentage' (Aniqlik foizi & Tezlik) | 'weekly' (Haftalik faollar)
  const [metric, setMetric] = useState<'correct' | 'percentage' | 'weekly'>('correct');

  // Compute current user stats based on latest attempt per unique block (4 points per correct answer)
  const stats = calculateUserRatingStats(testAttempts);

  const currentUserEntry: LeaderboardUser = {
    id: profile.id,
    name: `${profile.firstName || 'Siz'} ${profile.lastName || ''}`.trim() || 'Siz',
    region: profile.region,
    university: profile.university || 'TATU',
    avatar: profile.avatar || DEFAULT_AVATAR,
    academicYear: profile.academicYear,
    coins: profile.coins,
    testsCompleted: Math.max(profile.completedTestsCount, stats.uniqueBlocksCount),
    correctAnswersCount: stats.totalCorrectAnswers,
    scorePoints: stats.scorePoints,
    totalQuestionsAttempted: stats.totalQuestionsAttempted,
    accuracyPercentage: stats.accuracyPercentage,
    bestTime: stats.bestTimeFormatted,
    bestTimeSeconds: stats.bestTimeSeconds,
    weeklyActiveHours: 12.0,
    isCurrentUser: true,
  };

  // Merge users without duplicate IDs
  const allUsers: LeaderboardUser[] = [
    ...leaderboard.filter((u) => u.id !== profile.id),
    currentUserEntry,
  ];

  // Level 1 Scope Filter: 'otm' | 'region' | 'uzbekistan'
  const filteredUsers = allUsers.filter((u) => {
    if (leaderboardScope === 'region') {
      return u.region === profile.region;
    }
    return true; // 'uzbekistan' and others
  });

  // Level 2 Sort for Students:
  // - If metric === 'correct': sort by scorePoints (4 points per correct answer on latest block attempt)
  // - If metric === 'percentage': sort by accuracy %, tie-breaker: faster time (lower seconds)
  // - If metric === 'weekly': sort by active hours
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (metric === 'correct') {
      const aPoints =
        a.scorePoints ??
        (a.correctAnswersCount !== undefined
          ? a.correctAnswersCount * 4
          : a.testsCompleted * 22 * 4);
      const bPoints =
        b.scorePoints ??
        (b.correctAnswersCount !== undefined
          ? b.correctAnswersCount * 4
          : b.testsCompleted * 22 * 4);
      if (bPoints !== aPoints) return bPoints - aPoints;
      return (a.bestTimeSeconds || 180) - (b.bestTimeSeconds || 180);
    }

    if (metric === 'percentage') {
      const aAcc = a.accuracyPercentage ?? 80;
      const bAcc = b.accuracyPercentage ?? 80;
      // Primary: Higher percentage
      if (bAcc !== aAcc) {
        return bAcc - aAcc;
      }
      // Tie-breaker: Lower completion time in seconds (faster student wins!)
      const aTime = a.bestTimeSeconds || 180;
      const bTime = b.bestTimeSeconds || 180;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      const aPoints =
        a.scorePoints ?? (a.correctAnswersCount !== undefined ? a.correctAnswersCount * 4 : 0);
      const bPoints =
        b.scorePoints ?? (b.correctAnswersCount !== undefined ? b.correctAnswersCount * 4 : 0);
      return bPoints - aPoints;
    }

    // Weekly active hours
    return b.weeklyActiveHours - a.weeklyActiveHours;
  });

  // University Leaderboard dynamically computed from registered universities and active students
  const sortedUniversities: UniversityLeaderboardEntry[] = useMemo(() => {
    const list = universities && universities.length > 0 ? universities : [];

    return list
      .map((uni, idx) => {
        const uniUsers = allUsers.filter(
          (u) => u.university && u.university.trim().toLowerCase() === uni.trim().toLowerCase()
        );
        const activeStudentsCount = uniUsers.length;
        const totalCorrectAnswers = uniUsers.reduce(
          (sum, u) => sum + (u.correctAnswersCount ?? u.testsCompleted * 22),
          0
        );
        const totalScorePoints = uniUsers.reduce(
          (sum, u) =>
            sum +
            (u.scorePoints ??
              (u.correctAnswersCount !== undefined
                ? u.correctAnswersCount * 4
                : u.testsCompleted * 22 * 4)),
          0
        );
        const averageAccuracy =
          uniUsers.length > 0
            ? Math.round(
                uniUsers.reduce((sum, u) => sum + (u.accuracyPercentage || 80), 0) /
                  uniUsers.length
              )
            : 0;
        const averageTimeSeconds =
          uniUsers.length > 0
            ? Math.round(
                uniUsers.reduce((sum, u) => sum + (u.bestTimeSeconds || 180), 0) /
                  uniUsers.length
              )
            : 180;
        const testsCompletedCount = uniUsers.reduce(
          (sum, u) => sum + (u.testsCompleted || 0),
          0
        );
        const coinsEarned = uniUsers.reduce((sum, u) => sum + (u.coins || 0), 0);
        const shortName = uni.length > 30 ? uni.substring(0, 27) + '...' : uni;
        const mins = Math.floor(averageTimeSeconds / 60);
        const secs = averageTimeSeconds % 60;
        const averageTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        return {
          id: `uni-${idx}-${uni}`,
          name: uni,
          shortName,
          type: 'otm' as const,
          region: uniUsers[0]?.region || "O'zbekiston",
          activeStudentsCount,
          totalCorrectAnswers,
          totalScorePoints,
          averageAccuracy,
          averageTime,
          averageTimeSeconds,
        };
      })
      .sort((a, b) => {
        // Prioritize universities that have active students
        if (b.activeStudentsCount > 0 && a.activeStudentsCount === 0) return 1;
        if (a.activeStudentsCount > 0 && b.activeStudentsCount === 0) return -1;

        if (metric === 'percentage') {
          if (b.averageAccuracy !== a.averageAccuracy) {
            return b.averageAccuracy - a.averageAccuracy;
          }
          return a.averageTimeSeconds - b.averageTimeSeconds;
        }
        if (metric === 'weekly') {
          return b.activeStudentsCount - a.activeStudentsCount;
        }
        if (b.totalScorePoints !== a.totalScorePoints) {
          return (b.totalScorePoints || 0) - (a.totalScorePoints || 0);
        }
        if (b.totalCorrectAnswers !== a.totalCorrectAnswers) {
          return b.totalCorrectAnswers - a.totalCorrectAnswers;
        }
        return b.activeStudentsCount - a.activeStudentsCount;
      });
  }, [universities, allUsers, metric]);

  // Current user's rank
  const userRankIndex = sortedUsers.findIndex((u) => u.isCurrentUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : sortedUsers.length;

  // Next rank requirement calculation
  let neededAnswers = 1;
  let progressPercent = 75;
  if (userRank > 1) {
    const aheadUser = sortedUsers[userRank - 2];
    if (metric === 'correct') {
      const aheadPoints =
        aheadUser.scorePoints ??
        (aheadUser.correctAnswersCount !== undefined
          ? aheadUser.correctAnswersCount * 4
          : aheadUser.testsCompleted * 22 * 4);
      neededAnswers = Math.max(4, aheadPoints - stats.scorePoints + 4);
      progressPercent =
        aheadPoints > 0 ? Math.min(100, Math.round((stats.scorePoints / aheadPoints) * 100)) : 50;
    } else if (metric === 'percentage') {
      const aheadAcc = aheadUser.accuracyPercentage ?? 80;
      neededAnswers = Math.max(1, aheadAcc - stats.accuracyPercentage);
      progressPercent =
        aheadAcc > 0 ? Math.min(100, Math.round((stats.accuracyPercentage / aheadAcc) * 100)) : 70;
    } else {
      const aheadHours = aheadUser.weeklyActiveHours;
      progressPercent = Math.min(
        100,
        Math.round((currentUserEntry.weeklyActiveHours / aheadHours) * 100)
      );
    }
  }

  // Top 3 for Students
  const first = sortedUsers[0];
  const second = sortedUsers[1];
  const third = sortedUsers[2];
  const listUsers = sortedUsers.slice(3, 20);

  // Top 3 for Universities
  const uniFirst = sortedUniversities[0];
  const uniSecond = sortedUniversities[1];
  const uniThird = sortedUniversities[2];
  const uniList = sortedUniversities.slice(3);

  // Format student metric value (shows points e.g. 72 ball, 80 ball, 100 ball, 200 ball, 400 ball)
  const formatMetricValue = (u: LeaderboardUser, isPodium: boolean = false) => {
    if (metric === 'percentage') {
      const acc = u.accuracyPercentage ?? 80;
      const time = u.bestTime || '02:45';
      return (
        <div className={`flex flex-col ${isPodium ? 'items-center text-center' : 'items-end text-right'}`}>
          <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5">
            <Percent className="w-3 h-3" />
            <span>{acc}%</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-0.5">
            <Clock className="w-2.5 h-2.5 text-indigo-400" />
            <span>{time}</span>
          </span>
        </div>
      );
    }

    if (metric === 'correct') {
      const points =
        u.scorePoints ??
        (u.correctAnswersCount !== undefined
          ? u.correctAnswersCount * 4
          : u.testsCompleted * 22 * 4);
      const count = u.correctAnswersCount ?? u.testsCompleted * 22;
      return (
        <div className={`flex flex-col ${isPodium ? 'items-center text-center' : 'items-end text-right'}`}>
          <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
            {points.toLocaleString('uz-UZ')} {t.pointsLabel}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {count.toLocaleString('uz-UZ')} {t.correctAnswersShort}
          </span>
        </div>
      );
    }

    return (
      <span className="font-extrabold text-xs text-orange-600 dark:text-orange-400">
        {u.weeklyActiveHours}{t.hoursShort} {t.metricWeekly}
      </span>
    );
  };

  // Format university metric value
  const formatUniMetricValue = (uni: UniversityLeaderboardEntry, isPodium: boolean = false) => {
    if (metric === 'percentage') {
      return (
        <div className={`flex flex-col ${isPodium ? 'items-center text-center' : 'items-end text-right'}`}>
          <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
            {uni.averageAccuracy}% {t.accuracyLabel}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
            <Clock className="w-3 h-3 text-slate-400 inline" />
            <span>{uni.averageTime}</span>
          </span>
        </div>
      );
    }
    if (metric === 'weekly') {
      return (
        <div className={`flex flex-col ${isPodium ? 'items-center text-center' : 'items-end text-right'}`}>
          <span className="font-black text-xs text-orange-600 dark:text-orange-400">
            {uni.activeStudentsCount.toLocaleString('uz-UZ')} {t.activeParticipants}
          </span>
          <span className="text-[10px] text-slate-400">{t.activeParticipants}</span>
        </div>
      );
    }
    return (
      <div className={`flex flex-col ${isPodium ? 'items-center text-center' : 'items-end text-right'}`}>
        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
          {(uni.totalScorePoints ?? uni.totalCorrectAnswers * 4).toLocaleString('uz-UZ')} {t.pointsLabel}
        </span>
        <span className="text-[10px] text-slate-400">{uni.activeStudentsCount} {t.fromStudentsCount}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>{t.navRating}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t.leaderboardSubtitle}
        </p>
      </div>

      {/* User Position Header Card (Only on Student view) */}
      {leaderboardScope !== 'otm' && (
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-4 shadow-xl border border-emerald-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <UserAvatar
                  avatar={profile.avatar || DEFAULT_AVATAR}
                  alt={profile.firstName || 'Talaba'}
                  sizeClassName="w-11 h-11"
                  className="ring-2 ring-emerald-400"
                />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-orange-400 text-slate-950 font-black text-[9px] shadow-sm">
                  #{userRank}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm text-white line-clamp-1">
                    {profile.firstName || 'Talaba'} {profile.lastName || ''}
                  </h3>
                </div>
                <p className="text-[11px] text-emerald-200/80 font-medium">
                  {profile.region} • {userRank} {t.rankPlace}
                </p>
              </div>
            </div>

            <div className="text-right">
              {metric === 'percentage' ? (
                <div>
                  <div className="text-base font-black text-emerald-400 flex items-center justify-end gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>{stats.accuracyPercentage}%</span>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 font-medium flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{stats.bestTimeFormatted}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-base font-black text-orange-300">
                    {stats.scorePoints.toLocaleString('uz-UZ')} {t.pointsLabel}
                  </div>
                  <div className="text-[10px] text-emerald-200/90 font-medium flex items-center justify-end gap-1">
                    <span>{stats.totalCorrectAnswers} {t.correctAnswersShort}</span>
                    <span>•</span>
                    <Clock className="w-2.5 h-2.5 text-emerald-400 inline" />
                    <span>{stats.bestTimeFormatted}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar & Next Position Prompt */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-2.5 border border-white/10">
            <div className="flex items-center justify-between gap-2.5 text-[11px] font-semibold text-emerald-100 mb-1.5">
              <span className="truncate pr-1">
                {userRank === 1
                  ? t.youAreLeading
                  : metric === 'percentage'
                  ? t.nextRankAccReq.replace('{count}', String(neededAnswers))
                  : t.nextRankPointsReq.replace('{count}', String(neededAnswers))}
              </span>
              <span className="font-extrabold text-orange-300 shrink-0 ml-auto bg-orange-400/10 px-1.5 py-0.5 rounded-md border border-orange-400/20 text-[10px]">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs Container */}
      <div className="space-y-2">
        {/* Level 1: Scope - OTM comes FIRST before Region, then Uzbekistan */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold border border-slate-200 dark:border-slate-800">
          {/* 1. OTM Scope (First!) */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setLeaderboardScope('otm');
            }}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              leaderboardScope === 'otm'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <School className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.scopeUnis}</span>
          </button>

          {/* 2. Region Scope */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setLeaderboardScope('region');
            }}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              leaderboardScope === 'region'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{profile.region}</span>
          </button>

          {/* 3. Uzbekistan Scope */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setLeaderboardScope('uzbekistan');
            }}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              leaderboardScope === 'uzbekistan'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>{t.scopeUzbekistan}</span>
          </button>
        </div>

        {/* Level 2: Metric - Correct answers, then PERCENTAGE in the middle, then Weekly */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold border border-slate-200 dark:border-slate-800">
          {/* 1. Correct answers & Points */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setMetric('correct');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
              metric === 'correct'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="truncate">{t.metricPoints}</span>
          </button>

          {/* 2. Percentage & Speed (In the MIDDLE) */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setMetric('percentage');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
              metric === 'percentage'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="truncate">{t.metricAccuracySpeed}</span>
          </button>

          {/* 3. Weekly active */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setMetric('weekly');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
              metric === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3 text-orange-500 shrink-0" />
            <span className="truncate">{t.metricWeekly}</span>
          </button>
        </div>
      </div>

      {/* Main Content: OTMs vs Students */}
      {leaderboardScope === 'otm' ? (
        /* OTM & Educational Center Leaderboard View */
        sortedUniversities.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <School className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {t.emptyUnisTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              {t.emptyUnisDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {t.unisRankingTitle}
                </span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                {sortedUniversities.length} {t.unisCountLabel}
              </span>
            </div>

          {/* Universities Olympic Podium (Top 3) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-end justify-center gap-1.5 pt-6 pb-2">
              {/* 2nd Place (Silver) */}
              {uniSecond && (
                <div className="w-1/3 flex flex-col items-center text-center justify-end px-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-xs shadow-sm mb-2 relative">
                    <Building2 className="w-5 h-5 text-slate-500" />
                    <span className="absolute -bottom-2 -right-1 w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-black text-[10px] flex items-center justify-center shadow-md">
                      2
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate w-full text-center">
                    {uniSecond.shortName}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate w-full text-center mb-1">
                    {uniSecond.region}
                  </p>
                  <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/60 p-1">
                    <span className="text-[10px] font-bold text-slate-500">2{t.rankPlace}</span>
                    {formatUniMetricValue(uniSecond, true)}
                  </div>
                </div>
              )}

              {/* 1st Place (Gold, Tallest + Crown) */}
              {uniFirst && (
                <div className="w-1/3 flex flex-col items-center text-center justify-end px-0.5 relative -mt-4">
                  <div className="relative mb-2">
                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-amber-300 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20">
                      <School className="w-7 h-7 text-slate-950" />
                    </div>
                    <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                      1
                    </span>
                  </div>
                  <h4 className="font-black text-xs text-slate-900 dark:text-white truncate w-full text-center">
                    {uniFirst.shortName}
                  </h4>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate w-full text-center mb-1">
                    {uniFirst.region}
                  </p>
                  <div className="h-20 w-full bg-gradient-to-t from-amber-500/20 via-amber-400/10 to-transparent dark:from-amber-950/60 dark:to-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-amber-300 dark:border-amber-700/70 p-1 shadow-sm">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">1{t.rankPlace}</span>
                    {formatUniMetricValue(uniFirst, true)}
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {uniThird && (
                <div className="w-1/3 flex flex-col items-center text-center justify-end px-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-amber-700/50 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-xs shadow-sm mb-2 relative">
                    <Building2 className="w-5 h-5 text-amber-700" />
                    <span className="absolute -bottom-2 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shadow-md">
                      3
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate w-full text-center">
                    {uniThird.shortName}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate w-full text-center mb-1">
                    {uniThird.region}
                  </p>
                  <div className="h-14 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/60 p-1">
                    <span className="text-[10px] font-bold text-slate-500">3{t.rankPlace}</span>
                    {formatUniMetricValue(uniThird, true)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Universities List (4th - End) */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              {t.allUnisListTitle.replace('{count}', String(sortedUniversities.length))}
            </h3>

            <div className="space-y-2">
              {uniList.map((uni, idx) => {
                const rank = idx + 4;
                return (
                  <div
                    key={uni.id}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 flex items-center justify-between gap-3 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-xs shrink-0">
                        {rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {uni.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                              uni.type === 'center'
                                ? 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {uni.type === 'center' ? t.catCenter : 'OTM'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{uni.region}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {uni.activeStudentsCount} {t.activeStudentsLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {formatUniMetricValue(uni)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )
      ) : (
        /* Students Leaderboard View (Region or Uzbekistan) */
        sortedUsers.length === 0 || (stats.scorePoints === 0 && sortedUsers.length <= 1) ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Trophy className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {t.emptyStudentsTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              {t.emptyStudentsDesc}
            </p>
          </div>
        ) : (
          <>
            {/* Top Olympic Podium for Students */}
            {first && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-end justify-center gap-1.5 pt-6 pb-2">
                  {/* 2nd Place (Silver) */}
                  {second ? (
                    <div className="w-1/3 flex flex-col items-center text-center justify-end px-0.5">
                      <div className="relative mb-2">
                        <UserAvatar
                          avatar={second.avatar}
                          alt={second.name}
                          sizeClassName="w-12 h-12"
                          className="ring-2 ring-slate-300 dark:ring-slate-600"
                        />
                        <span className="absolute -bottom-2 -right-1 w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-black text-[10px] flex items-center justify-center shadow-md">
                          2
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate w-full text-center">
                        {second.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate w-full text-center mb-1">
                        {second.region}
                      </p>
                      <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/60 p-1">
                        <span className="text-[10px] font-bold text-slate-500">2{t.rankPlace}</span>
                        {formatMetricValue(second, true)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-1/3" />
                  )}

                  {/* 1st Place (Gold, Tallest + Crown) */}
                  <div className="w-1/3 flex flex-col items-center text-center justify-end px-0.5 relative -mt-4">
                    <div className="relative mb-2">
                      <Crown className="w-5 h-5 text-amber-500 fill-amber-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                      <UserAvatar
                        avatar={first.avatar}
                        alt={first.name}
                        sizeClassName="w-14 h-14"
                        className="ring-4 ring-amber-400 shadow-lg shadow-amber-400/20"
                      />
                      <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                        1
                      </span>
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-white truncate w-full text-center">
                      {first.name}
                    </h4>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate w-full text-center mb-1">
                      {first.region}
                    </p>
                    <div className="h-20 w-full bg-gradient-to-t from-amber-500/20 via-amber-400/10 to-transparent dark:from-amber-950/60 dark:to-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-amber-300 dark:border-amber-700/70 p-1 shadow-sm">
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">1{t.rankPlace}</span>
                      {formatMetricValue(first, true)}
                    </div>
                  </div>

                  {/* 3rd Place (Bronze) */}
                  {third ? (
                    <div className="w-1/3 flex flex-col items-center text-center justify-end px-0.5">
                      <div className="relative mb-2">
                        <UserAvatar
                          avatar={third.avatar}
                          alt={third.name}
                          sizeClassName="w-12 h-12"
                          className="ring-2 ring-amber-700/50"
                        />
                        <span className="absolute -bottom-2 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shadow-md">
                          3
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate w-full text-center">
                        {third.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate w-full text-center mb-1">
                        {third.region}
                      </p>
                      <div className="h-14 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/60 p-1">
                        <span className="text-[10px] font-bold text-slate-500">3{t.rankPlace}</span>
                        {formatMetricValue(third, true)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-1/3" />
                  )}
                </div>
              </div>
            )}

            {/* List Ranks (4th - 20th) for Students */}
            {listUsers.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  {t.allStudentsListTitle}
                </h3>

                <div className="space-y-2">
                  {listUsers.map((user, idx) => {
                    const rank = idx + 4;
                    const isMe = user.isCurrentUser;

                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-2xl flex items-center justify-between transition-all ${
                          isMe
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-2 border-indigo-500 shadow-md shadow-indigo-500/10'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isMe
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {rank}
                          </div>

                          <UserAvatar
                            avatar={user.avatar}
                            alt={user.name}
                            sizeClassName="w-9 h-9"
                            className={isMe ? 'ring-2 ring-indigo-400' : ''}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                {user.name}
                              </h4>
                              {isMe && (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold shrink-0">
                                  {t.youBadge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {user.region} • {user.university}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {formatMetricValue(user)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};
