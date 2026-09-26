import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  Trophy,
  Medal,
  Flame,
  Coins,
  MapPin,
  Clock,
  Filter,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { UZBEKISTAN_REGIONS, Region, LeaderboardUser } from '../types';
import { triggerHaptic } from '../utils/telegram';

type SortCriterion = 'tests' | 'weekly' | 'coins';

export const Leaderboard: React.FC = () => {
  const { leaderboard, profile } = useQuizStore();

  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('tests');

  // Inject current user into leaderboard for ranking calculations
  const allUsers: LeaderboardUser[] = [
    ...leaderboard,
    {
      id: profile.id,
      name: `${profile.firstName || 'Siz'} ${profile.lastName || ''}`.trim(),
      region: profile.region,
      university: 'Mening OTMim',
      avatar: profile.avatar || '👨‍🎓',
      academicYear: profile.academicYear,
      coins: profile.coins,
      testsCompleted: profile.completedTestsCount,
      weeklyActiveHours: 12.0,
      isCurrentUser: true,
    },
  ];

  // Filter by region if specified
  const filteredUsers = allUsers.filter((u) => {
    if (selectedRegion === 'all') return true;
    return u.region === selectedRegion;
  });

  // Sort based on criterion
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortCriterion === 'tests') return b.testsCompleted - a.testsCompleted;
    if (sortCriterion === 'weekly') return b.weeklyActiveHours - a.weeklyActiveHours;
    return b.coins - a.coins;
  });

  // Top 20
  const top20 = sortedUsers.slice(0, 20);

  // Top 3 for Olympic Podium
  const first = top20[0];
  const second = top20[1];
  const third = top20[2];

  // Find user rank
  const userRankIndex = sortedUsers.findIndex((u) => u.isCurrentUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 999;

  const getMetricDisplay = (u: LeaderboardUser) => {
    if (sortCriterion === 'tests') {
      return (
        <div className="flex items-center gap-1 font-black text-xs text-indigo-600 dark:text-indigo-400">
          <span>{u.testsCompleted}</span>
          <span className="text-[10px] text-slate-400 font-normal">test</span>
        </div>
      );
    }
    if (sortCriterion === 'weekly') {
      return (
        <div className="flex items-center gap-1 font-black text-xs text-orange-600 dark:text-orange-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{u.weeklyActiveHours}s</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 font-black text-xs text-amber-600 dark:text-amber-400">
        <Coins className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
        <span>{u.coins}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Talabalar Reytingi (Top 20)</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          O'zbekiston bo'ylab eng bilimdon va faol talabalar
        </p>
      </div>

      {/* Sorting Criteria Tabs */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setSortCriterion('tests');
          }}
          className={`py-2 rounded-xl transition-all ${
            sortCriterion === 'tests'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Eng ko'p testlar
        </button>
        <button
          onClick={() => {
            triggerHaptic('selection');
            setSortCriterion('weekly');
          }}
          className={`py-2 rounded-xl transition-all ${
            sortCriterion === 'weekly'
              ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Haftalik faol
        </button>
        <button
          onClick={() => {
            triggerHaptic('selection');
            setSortCriterion('coins');
          }}
          className={`py-2 rounded-xl transition-all ${
            sortCriterion === 'coins'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Tangalar bo'yicha
        </button>
      </div>

      {/* Region Filter Selector */}
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={selectedRegion}
          onChange={(e) => {
            triggerHaptic('selection');
            setSelectedRegion(e.target.value);
          }}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Barcha viloyatlar (O'zbekiston bo'ylab)</option>
          {UZBEKISTAN_REGIONS.map((reg) => (
            <option key={reg} value={reg}>
              {reg}
            </option>
          ))}
        </select>
      </div>

      {/* 3D-styled Olympic Podium for Top 3 */}
      {top20.length >= 3 && (
        <div className="pt-8 pb-3 px-2">
          <div className="flex items-end justify-center gap-2">
            {/* 2nd Place (Silver) */}
            {second && (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-2xl shadow-md">
                    {second.avatar}
                  </div>
                  <div className="absolute -top-2.5 -right-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[11px] flex items-center justify-center border border-white dark:border-slate-800 shadow">
                    2
                  </div>
                </div>

                <p className="font-extrabold text-[11px] text-slate-900 dark:text-white text-center line-clamp-1 w-full">
                  {second.name}
                </p>
                <div className="mt-0.5">{getMetricDisplay(second)}</div>

                {/* Podium pillar */}
                <div className="w-full h-20 mt-2 bg-gradient-to-t from-slate-300 via-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-2xl flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xl">🥈</span>
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">Kumush</span>
                </div>
              </div>
            )}

            {/* 1st Place (Gold) */}
            {first && (
              <div className="flex-1 flex flex-col items-center -mt-6">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg ring-4 ring-amber-400/20 animate-soft-pulse">
                    {first.avatar}
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-500">
                    <Crown className="w-5 h-5 fill-amber-400 stroke-amber-600" />
                  </div>
                  <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center border border-white shadow">
                    1
                  </div>
                </div>

                <p className="font-black text-xs text-slate-900 dark:text-white text-center line-clamp-1 w-full">
                  {first.name}
                </p>
                <div className="mt-0.5">{getMetricDisplay(first)}</div>

                {/* Podium pillar */}
                <div className="w-full h-28 mt-2 bg-gradient-to-t from-amber-400 via-amber-300 to-yellow-200 dark:from-amber-600 dark:to-amber-500 rounded-t-2xl flex flex-col items-center justify-center shadow-lg text-slate-950">
                  <span className="text-2xl">🥇</span>
                  <span className="text-[10px] font-black">Oltin</span>
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {third && (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border-2 border-amber-700/40 flex items-center justify-center text-2xl shadow-md">
                    {third.avatar}
                  </div>
                  <div className="absolute -top-2.5 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-[11px] flex items-center justify-center border border-white dark:border-slate-800 shadow">
                    3
                  </div>
                </div>

                <p className="font-extrabold text-[11px] text-slate-900 dark:text-white text-center line-clamp-1 w-full">
                  {third.name}
                </p>
                <div className="mt-0.5">{getMetricDisplay(third)}</div>

                {/* Podium pillar */}
                <div className="w-full h-16 mt-2 bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 rounded-t-2xl flex flex-col items-center justify-center shadow-inner text-white">
                  <span className="text-lg">🥉</span>
                  <span className="text-[10px] font-black">Bronza</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranks 4 to 20 List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80">
        {top20.slice(3).map((user, idx) => {
          const rankNum = idx + 4;
          const isMe = user.isCurrentUser;

          return (
            <div
              key={user.id}
              className={`py-2.5 px-2 flex items-center justify-between gap-3 rounded-xl transition-colors ${
                isMe ? 'bg-indigo-50/80 dark:bg-indigo-950/50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-bold text-xs text-slate-400">
                  {rankNum}
                </span>

                <div className="text-xl">{user.avatar}</div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {user.name}
                    </h4>
                    {isMe && (
                      <span className="text-[10px] font-bold px-1.5 rounded-full bg-indigo-600 text-white">
                        Siz
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {user.region} • {user.university}
                  </p>
                </div>
              </div>

              <div className="shrink-0">{getMetricDisplay(user)}</div>
            </div>
          );
        })}
      </div>

      {/* User's Pinned Standing at Bottom */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-indigo-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
            {profile.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black">Sizning o'rningiz: #{userRank}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/50 font-bold">
                {profile.region}
              </span>
            </div>
            <p className="text-[10px] text-indigo-200">
              {profile.completedTestsCount} ta test yechilgan • {profile.coins} tanga
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-extrabold text-amber-300">
            {userRank <= 3 ? 'Top 3 🏆' : userRank <= 20 ? 'Top 20 🌟' : 'Faol talaba'}
          </span>
        </div>
      </div>
    </div>
  );
};
