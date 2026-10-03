import React, { useState, useMemo, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Trophy,
  Crown,
  Clock,
  CheckCircle2,
  MapPin,
  School,
  Building2,
  Percent,
  Zap,
  Users,
  RefreshCw,
} from 'lucide-react';
import { LeaderboardUser, UniversityLeaderboardEntry } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { UserAvatar } from './UserAvatar';
import { DEFAULT_AVATAR } from '../constants/avatars';
import { calculateUserRatingStats, compareLeaderboardUsers } from '../utils/ratingUtils';
import { UserRankProgressCard } from './UserRankProgressCard';

export const Leaderboard: React.FC = () => {
  const {
    leaderboard,
    profile,
    testAttempts,
    leaderboardScope,
    setLeaderboardScope,
    universities,
  } = useQuizStore();
  const { t } = useTranslation();

  // Mode: 'students' (Talabalar reytingi) | 'universities' (OTMlar reytingi)
  const [viewMode, setViewMode] = useState<'students' | 'universities'>('students');

  // Metric filter: 'correct' (Reyting ballari) | 'percentage' (Aniqlik foizi & Tezlik) | 'weekly' (Haftalik faollar)
  const [metric, setMetric] = useState<'correct' | 'percentage' | 'weekly'>('correct');

  // Compute current user stats based on latest attempt per unique block (4 points per correct answer)
  const stats = calculateUserRatingStats(testAttempts);

  const [syncError, setSyncError] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const syncLeaderboard = async () => {
    setIsSyncing(true);
    try {
      const { syncUserProfileToCloud, fetchCloudLeaderboard } = await import(
        '../services/testSyncService'
      );
      // Run push and fetch in parallel so neither blocks the other
      const [_, fetchRes] = await Promise.allSettled([
        syncUserProfileToCloud(profile, stats),
        fetchCloudLeaderboard(),
      ]);

      const remoteUsers = fetchRes.status === 'fulfilled' ? fetchRes.value : [];
      if (remoteUsers) {
        useQuizStore.setState((state) => {
          const cleanProfId = (state.profile.id || '').replace(/^lead_/, '');
          const remoteOthers = remoteUsers.filter((u) => (u.id || '').replace(/^lead_/, '') !== cleanProfId);
          const remoteMap = new Map<string, LeaderboardUser>();
          for (const u of remoteOthers) {
            const cleanId = (u.id || '').replace(/^lead_/, '');
            remoteMap.set(cleanId, { ...u, id: cleanId });
          }
          return { leaderboard: Array.from(remoteMap.values()) };
        });
      }
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync real users from cloud and sync current user
  useEffect(() => {
    syncLeaderboard();
  }, []);

  const cleanProfileId = (profile.id || '').replace(/^lead_/, '');
  const currentUserEntry: LeaderboardUser = {
    id: cleanProfileId,
    name: `${profile.firstName || 'Talaba'} ${profile.lastName || ''}`.trim() || 'Talaba',
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
    totalTimeSpentSeconds: stats.totalTimeSpentSeconds,
    totalTimeSpentFormatted: stats.totalTimeSpentFormatted,
    weeklyActiveHours: 12.0,
    isCurrentUser: true,
  };

  // Merge users without duplicate IDs (Strictly real users only)
  const allUsers: LeaderboardUser[] = [
    ...leaderboard.filter((u) => (u.id || '').replace(/^lead_/, '') !== cleanProfileId),
    currentUserEntry,
  ];

  // Level 1 Scope Filter: 'otm' | 'region' | 'uzbekistan'
  const filteredUsers = allUsers.filter((u) => {
    if (leaderboardScope === 'region') {
      return (u.region || '').trim().toLowerCase() === (profile.region || '').trim().toLowerCase();
    }
    if (leaderboardScope === 'otm') {
      return (
        u.university &&
        profile.university &&
        u.university.trim().toLowerCase() === profile.university.trim().toLowerCase()
      );
    }
    return true; // 'uzbekistan' (Respublika - includes everyone unconditionally)
  });

  // Level 2 Sort for Students:
  // - If metric === 'correct': sort by scorePoints (4 points per correct answer on latest block attempt)
  //   Tie-breaker: if correct answers/points are equal, user with lower total time spent ranks higher
  // - If metric === 'percentage': sort by accuracy %, tie-breaker: faster time (lower seconds)
  // - If metric === 'weekly': sort by active hours
  const sortedUsers = [...filteredUsers].sort((a, b) => compareLeaderboardUsers(a, b, metric));

  // STRICT LIMIT: Exactly TOP 20 users across filters
  const top20Users = sortedUsers.slice(0, 20);
  const first = top20Users[0];
  const second = top20Users[1];
  const third = top20Users[2];
  const listUsers = top20Users.slice(3, 20);

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

  const uniFirst = sortedUniversities[0];
  const uniSecond = sortedUniversities[1];
  const uniThird = sortedUniversities[2];
  const uniList = sortedUniversities.slice(3, 20); // Top 20 universities

  // Format student metric value (points and correct answers count)
  const formatMetricValue = (u: LeaderboardUser, isPodium: boolean = false) => {
    const points =
      u.scorePoints ??
      (u.correctAnswersCount !== undefined
        ? u.correctAnswersCount * 4
        : (u.testsCompleted || 0) * 22 * 4);
    const count = u.correctAnswersCount ?? (u.testsCompleted ? u.testsCompleted * 22 : 0);

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
            <Clock className="w-2.5 h-2.5 text-emerald-500" strokeWidth={1.75} />
            <span>{time}</span>
          </span>
        </div>
      );
    }

    if (metric === 'weekly') {
      return (
        <span className="font-extrabold text-xs text-orange-600 dark:text-orange-400">
          {u.weeklyActiveHours}{t.hoursShort} {t.metricWeekly}
        </span>
      );
    }

    // Default: 'correct' - show score points and correct answers count
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
            {uni.activeStudentsCount.toLocaleString('uz-UZ')}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>{t.navRating}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.leaderboardSubtitle}
          </p>
        </div>

        {/* Header Actions: Refresh & TOP 20 Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              triggerHaptic('light');
              syncLeaderboard();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            title="Yangilash"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <div className="px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-600 dark:text-amber-400 font-black text-xs shadow-xs">
            TOP 20
          </div>
        </div>
      </div>

      {/* Network / Cloud Sync Error Banner with Retry */}
      {syncError && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span className="truncate">{t.networkErrorNotice}</span>
          </div>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              triggerHaptic('light');
              syncLeaderboard();
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shrink-0 transition-colors active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{t.retryBtn}</span>
          </button>
        </div>
      )}

      {/* View Mode Switcher: Talabalar reytingi | OTMlar reytingi */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setViewMode('students');
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'students'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t.studentsRatingTab || 'Talabalar reytingi'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setViewMode('universities');
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'universities'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>{t.universitiesRatingTab || 'OTMlar reytingi'}</span>
        </button>
      </div>

      {/* Filters (Respublika, Viloyat, OTM) & Metric Tabs */}
      {viewMode === 'students' && (
        <div className="space-y-2">
          {/* Scope Filters: Respublika | Viloyat | OTM */}
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold border border-slate-200 dark:border-slate-800">
            {/* 1. Respublika */}
            <button
              type="button"
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
              <span>{t.scopeUzbekistanShort || 'Respublika'}</span>
            </button>

            {/* 2. Viloyat */}
            <button
              type="button"
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
              <span className="truncate">{profile.region || t.scopeRegionShort}</span>
            </button>

            {/* 3. OTM */}
            <button
              type="button"
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
              <span className="truncate">{t.scopeOtmShort || 'Mening OTMim'}</span>
            </button>
          </div>

          {/* Metric Sort Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold border border-slate-200 dark:border-slate-800">
            {/* 1. Points */}
            <button
              type="button"
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

            {/* 2. Percentage & Speed */}
            <button
              type="button"
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

            {/* 3. Weekly Activity */}
            <button
              type="button"
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
      )}

      {/* Main Content Area */}
      {viewMode === 'universities' ? (
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
                      <Crown className="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" strokeWidth={1.75} />
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 border-2 border-amber-300 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20">
                        <School className="w-7 h-7 text-slate-950" strokeWidth={1.75} />
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

            {/* Universities List (4th - 20th) */}
            {uniList.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  {t.allUnisListTitle.replace('{count}', String(Math.min(20, sortedUniversities.length)))}
                </h3>

                <div className="space-y-2">
                  {uniList.map((uni, idx) => {
                    const rank = idx + 4;
                    return (
                      <div
                        key={uni.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700 flex items-center justify-between gap-3 transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-xs shrink-0">
                            {rank}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {uni.name}
                            </h4>
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
            )}
          </div>
        )
      ) : (
        /* Students Leaderboard View (TOP 20 with Respublika, Viloyat, OTM filters) */
        top20Users.length === 0 ||
        (!top20Users.some((u) => (u.scorePoints || 0) > 0 || (u.testsCompleted || 0) > 0) &&
          testAttempts.length === 0) ? (
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
          <div className="space-y-4">
            {/* Top Olympic Podium for Students (Top 3) */}
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
                        {second.university || second.region}
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
                      <Crown className="w-5 h-5 text-amber-500 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" strokeWidth={1.75} />
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
                      {first.university || first.region}
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
                        {third.university || third.region}
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
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t.allStudentsListTitle}
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    TOP {Math.min(20, top20Users.length)}
                  </span>
                </div>

                <div className="space-y-2">
                  {listUsers.map((user, idx) => {
                    const rank = idx + 4;
                    const isMe = user.isCurrentUser;

                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-2xl flex items-center justify-between transition-all ${
                          isMe
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500 shadow-md shadow-emerald-500/10'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isMe
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {rank}
                          </div>

                          <UserAvatar
                            avatar={user.avatar}
                            alt={user.name}
                            sizeClassName="w-9 h-9"
                            className={isMe ? 'ring-2 ring-emerald-400' : ''}
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                {user.name}
                              </h4>
                              {isMe && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold shrink-0">
                                  {t.youBadge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {user.university || 'TATU'} • {user.region}
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
          </div>
        )
      )}

      {/* Pinned/Visible User Rank Progress Card at the bottom */}
      <div className="pt-2">
        <UserRankProgressCard scope={leaderboardScope} />
      </div>
    </div>
  );
};
