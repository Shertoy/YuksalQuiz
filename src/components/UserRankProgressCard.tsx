import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { Clock } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { calculateUserRatingStats } from '../utils/ratingUtils';
import { LeaderboardUser } from '../types';
import { DEFAULT_AVATAR } from '../constants/avatars';

interface UserRankProgressCardProps {
  className?: string;
  scope?: 'uzbekistan' | 'region' | 'otm';
}

export const UserRankProgressCard: React.FC<UserRankProgressCardProps> = ({
  className = '',
  scope,
}) => {
  const { profile, leaderboard, testAttempts, leaderboardScope } = useQuizStore();
  const { t } = useTranslation();

  const activeScope = scope || leaderboardScope;
  const stats = calculateUserRatingStats(testAttempts);

  const currentUserEntry: LeaderboardUser = {
    id: profile.id,
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

  // Merge users without duplicate IDs
  const allUsers: LeaderboardUser[] = [
    ...leaderboard.filter((u) => u.id !== profile.id),
    currentUserEntry,
  ];

  // Filter according to active scope (Respublika, Viloyat, OTM)
  const scopedUsers = allUsers.filter((u) => {
    if (activeScope === 'region') {
      return u.region === profile.region;
    }
    if (activeScope === 'otm') {
      return (
        u.university &&
        profile.university &&
        u.university.trim().toLowerCase() === profile.university.trim().toLowerCase()
      );
    }
    return true; // uzbekistan / respublika
  });

  // Sort by score points / correct answers (Tie-breaker: lower time spent ranks higher)
  const sortedUsers = [...scopedUsers].sort((a, b) => {
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
    const aTime = a.totalTimeSpentSeconds ?? a.bestTimeSeconds ?? 180;
    const bTime = b.totalTimeSpentSeconds ?? b.bestTimeSeconds ?? 180;
    return aTime - bTime;
  });

  const userRankIndex = sortedUsers.findIndex((u) => u.isCurrentUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 1;

  // Motivation calculation & progress
  const isRankOne = userRank === 1;
  let testsRemaining = 1;
  let progressPercent = 100;
  let motivationText = '';

  if (isRankOne) {
    progressPercent = 100;
    motivationText = t.youAreLeading || "Siz peshqadamsiz! O'rningizni saqlab qoling 🏆";
  } else {
    const aheadUser = sortedUsers[userRank - 2];
    const aheadUserTests =
      aheadUser?.correctAnswersCount ??
      (aheadUser?.scorePoints ? Math.floor(aheadUser.scorePoints / 4) : 0);
    const currentUserTests = stats.totalCorrectAnswers;

    // Dynamic formula: ahead user correct tests - current user correct tests
    const diff = aheadUserTests - currentUserTests;
    testsRemaining = Math.max(1, diff > 0 ? diff : 1);

    if (aheadUserTests > 0) {
      progressPercent = Math.min(99, Math.max(0, Math.round((currentUserTests / aheadUserTests) * 100)));
    } else {
      progressPercent = currentUserTests > 0 ? 100 : 0;
    }

    const targetRank = userRank - 1;
    motivationText = t.targetRankGoalText
      ? t.targetRankGoalText
          .replace('{rank}', String(targetRank))
          .replace('{count}', String(testsRemaining))
      : `${targetRank}-o'ringa chiqish uchun ${testsRemaining} ta to'g'ri test qoldi`;
  }

  // Format registration date as DD.MM.YYYY
  const rawDate = profile.registeredAt || profile.lastLoginDate || '2026-09-28';
  const formatDateToDDMMYYYY = (dateStr: string): string => {
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
      }
      return '28.09.2026';
    } catch {
      return '28.09.2026';
    }
  };
  const formattedRegisteredDate = formatDateToDDMMYYYY(rawDate);

  const fullName = `${profile.firstName || 'Talaba'} ${profile.lastName || ''}`.trim();
  const locationText = `${t.uzbekistanCountry || "O'zbekiston"} — ${profile.region}`;
  const universityName = profile.university || "Toshkent Axborot Texnologiyalari Universiteti (TATU)";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/80 text-white p-4 sm:p-5 shadow-xl border border-emerald-500/20 select-none ${className}`}
    >
      {/* Background Glow Orbs */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full bg-orange-400/10 blur-2xl pointer-events-none" />

      {/* Top Section */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        {/* Left: Avatar + Details */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with Neon/Gradient Border */}
          <div className="relative shrink-0">
            <div className="w-13 h-13 p-0.5 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-300 to-amber-400 shadow-md shadow-emerald-500/25">
              <UserAvatar
                avatar={profile.avatar}
                alt={fullName}
                sizeClassName="w-12 h-12"
                className="rounded-xl object-cover bg-slate-900"
              />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-md border-2 border-slate-900">
              #{userRank}
            </span>
          </div>

          {/* User Details */}
          <div className="min-w-0">
            <h3 className="font-black text-sm sm:text-base text-white truncate leading-tight">
              {fullName}
            </h3>

            {/* Location & University */}
            <div className="text-[11px] text-slate-300 font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-300 shrink-0">{locationText}</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium max-w-[220px] sm:max-w-none">
              {universityName}
            </p>

            {/* Registration Date */}
            <p className="text-[10px] text-slate-400/90 font-normal mt-0.5">
              {t.registeredDateLabel}: {formattedRegisteredDate}
            </p>
          </div>
        </div>

        {/* Right: Stats Block (Total correct tests solved + Total time spent) */}
        <div className="text-right shrink-0">
          <div className="text-base sm:text-lg font-black text-amber-400 dark:text-amber-300 flex items-center justify-end gap-1">
            <span>{stats.totalCorrectAnswers} {t.testsCountSuffix || 'ta test'}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-end gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{stats.totalTimeSpentFormatted || stats.bestTimeFormatted || '02:45'}</span>
          </div>
        </div>
      </div>

      {/* Bottom Motivational Block & Progress Bar */}
      <div className="relative z-10 bg-slate-950/70 dark:bg-black/50 rounded-2xl p-2.5 sm:p-3 border border-white/10 mt-3.5 shadow-inner">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white mb-2">
          <span className="truncate pr-1 text-slate-200">
            {motivationText}
          </span>
          <span className="font-black text-white shrink-0 text-xs">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
