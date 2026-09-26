import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Trophy,
  Crown,
  Clock,
  CheckCircle2,
  MapPin,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react';
import { LeaderboardUser } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { UserAvatar } from './UserAvatar';
import { DEFAULT_AVATAR } from '../constants/avatars';

export const Leaderboard: React.FC = () => {
  const { leaderboard, profile, testAttempts, leaderboardScope, setLeaderboardScope } = useQuizStore();
  const { t } = useTranslation();

  // Metric filter: 'correct' (To'g'ri testlar soni) | 'weekly' (Haftalik faollar)
  const [metric, setMetric] = useState<'correct' | 'weekly'>('correct');

  // Compute current user stats
  const currentUserCorrectAnswers = testAttempts.reduce((acc, att) => acc + att.score, 0);
  const currentUserBestTimeAttempt = testAttempts
    .filter((a) => a.timeSpentSeconds > 0)
    .sort((a, b) => a.timeSpentSeconds - b.timeSpentSeconds)[0];

  const currentUserBestTime = currentUserBestTimeAttempt
    ? `${Math.floor(currentUserBestTimeAttempt.timeSpentSeconds / 60)
        .toString()
        .padStart(2, '0')}:${(currentUserBestTimeAttempt.timeSpentSeconds % 60)
        .toString()
        .padStart(2, '0')}`
    : '03:45';

  const currentUserEntry: LeaderboardUser = {
    id: profile.id,
    name: `${profile.firstName || 'Siz'} ${profile.lastName || ''}`.trim() || 'Siz',
    region: profile.region,
    university: 'Mening OTMim',
    avatar: profile.avatar || DEFAULT_AVATAR,
    academicYear: profile.academicYear,
    coins: profile.coins,
    testsCompleted: Math.max(profile.completedTestsCount, testAttempts.length),
    correctAnswersCount: currentUserCorrectAnswers,
    bestTime: currentUserBestTime,
    weeklyActiveHours: 12.0,
    isCurrentUser: true,
  };

  // Merge users without duplicate IDs
  const allUsers: LeaderboardUser[] = [
    ...leaderboard.filter((u) => u.id !== profile.id),
    currentUserEntry,
  ];

  // Level 1 Filter: Scope ([User's Region] vs O'zbekiston)
  const filteredByScope = allUsers.filter((u) => {
    if (leaderboardScope === 'region') {
      return u.region === profile.region;
    }
    return true; // 'uzbekistan'
  });

  // Level 2 Sort: Metric ('correct' vs 'weekly')
  const sortedUsers = [...filteredByScope].sort((a, b) => {
    if (metric === 'correct') {
      const aVal = a.correctAnswersCount ?? a.testsCompleted * 22;
      const bVal = b.correctAnswersCount ?? b.testsCompleted * 22;
      return bVal - aVal;
    }
    return b.weeklyActiveHours - a.weeklyActiveHours;
  });

  // Current user's rank
  const userRankIndex = sortedUsers.findIndex((u) => u.isCurrentUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : sortedUsers.length;

  // Next rank requirement calculation
  let neededAnswers = 1;
  let progressPercent = 75;
  if (userRank > 1) {
    const aheadUser = sortedUsers[userRank - 2];
    const aheadVal = metric === 'correct'
      ? (aheadUser.correctAnswersCount ?? aheadUser.testsCompleted * 22)
      : aheadUser.weeklyActiveHours;
    const userVal = metric === 'correct'
      ? currentUserCorrectAnswers
      : currentUserEntry.weeklyActiveHours;

    neededAnswers = Math.max(1, Math.round(aheadVal - userVal + 1));
    progressPercent = aheadVal > 0 ? Math.min(100, Math.round((userVal / aheadVal) * 100)) : 50;
  }

  // Top 3 Podium
  const first = sortedUsers[0];
  const second = sortedUsers[1];
  const third = sortedUsers[2];

  // List Ranks (4th - 20th)
  const listUsers = sortedUsers.slice(3, 20);

  const formatMetricValue = (u: LeaderboardUser) => {
    if (metric === 'correct') {
      const count = u.correctAnswersCount ?? u.testsCompleted * 22;
      return (
        <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
          {count.toLocaleString('uz-UZ')} ta to'g'ri
        </span>
      );
    }
    return (
      <span className="font-extrabold text-xs text-orange-600 dark:text-orange-400">
        {u.weeklyActiveHours}s faol
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in select-none">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>{t.navRating}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          O'zbekiston bo'ylab eng faol va bilimdon talabalar
        </p>
      </div>

      {/* User Position Header Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-4 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <UserAvatar
                avatar={profile.avatar || DEFAULT_AVATAR}
                alt={profile.firstName || 'Talaba'}
                sizeClassName="w-11 h-11"
                className="ring-2 ring-indigo-400"
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm">
                #{userRank}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-white line-clamp-1">
                  {profile.firstName || 'Talaba'} {profile.lastName || ''}
                </h3>
              </div>
              <p className="text-[11px] text-indigo-200/80 font-medium">
                {profile.region} • {userRank}-o'rin
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-black text-amber-300">
              {currentUserCorrectAnswers} ta
            </div>
            <div className="text-[10px] text-indigo-300/80 font-medium flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
              <span>{currentUserBestTime}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Next Position Prompt */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-2.5 border border-white/10">
          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-200 mb-1.5">
            <span>
              {userRank === 1
                ? 'Siz peshqadamsiz! 🎉'
                : `Keyingi o'ringa chiqish uchun ${neededAnswers} ta to'g'ri javob qoldi`}
            </span>
            <span className="font-bold text-amber-300">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Strictly Simplified Filter Tabs */}
      <div className="space-y-2">
        {/* Level 1: Scope ([User's Region] | O'zbekiston) */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setLeaderboardScope('region');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              leaderboardScope === 'region'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{profile.region}</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setLeaderboardScope('uzbekistan');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              leaderboardScope === 'uzbekistan'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>O'zbekiston</span>
          </button>
        </div>

        {/* Level 2: Metric (To'g'ri testlar soni | Haftalik faollar) */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-bold border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setMetric('correct');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              metric === 'correct'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>To'g'ri testlar soni</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setMetric('weekly');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              metric === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>Haftalik faollar</span>
          </button>
        </div>
      </div>

      {/* Top 3 Olympic Podium */}
      {sortedUsers.length >= 3 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-end justify-center gap-2 pt-6 pb-2">
            {/* 2nd Place (Silver) */}
            {second && (
              <div className="flex-1 flex flex-col items-center text-center">
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
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1 w-full px-1">
                  {second.name}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mb-1">
                  {second.region}
                </p>
                <div className="h-24 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/60 p-1">
                  <span className="text-[10px] font-bold text-slate-500">2-o'rin</span>
                  {formatMetricValue(second)}
                </div>
              </div>
            )}

            {/* 1st Place (Gold, Tallest + Crown) */}
            {first && (
              <div className="flex-1 flex flex-col items-center text-center relative -mt-4">
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
                <h4 className="font-black text-xs text-slate-900 dark:text-white line-clamp-1 w-full px-1">
                  {first.name}
                </h4>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold line-clamp-1 mb-1">
                  {first.region}
                </p>
                <div className="h-32 w-full bg-gradient-to-t from-amber-500/20 via-amber-400/10 to-transparent dark:from-amber-950/60 dark:to-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-amber-300 dark:border-amber-700/70 p-1 shadow-sm">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">1-o'rin</span>
                  {formatMetricValue(first)}
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {third && (
              <div className="flex-1 flex flex-col items-center text-center">
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
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1 w-full px-1">
                  {third.name}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mb-1">
                  {third.region}
                </p>
                <div className="h-20 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700/60 p-1">
                  <span className="text-[10px] font-bold text-slate-500">3-o'rin</span>
                  {formatMetricValue(third)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List Ranks (4th - 20th) */}
      <div className="space-y-2">
        <h3 className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Barcha ishtirokchilar (4–20 o'rinlar)
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
                <div className="flex items-center gap-3">
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

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {user.name}
                      </h4>
                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold">
                          Siz
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
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
    </div>
  );
};
