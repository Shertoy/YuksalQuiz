import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Coins,
  Flame,
  Award,
  BookOpen,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Ticket,
  ChevronRight,
  School,
  Share2,
  X,
  Crown,
  Medal,
  Edit3,
  MapPin,
  Trophy,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/telegram';
import { TestPackage } from '../types';
import { decodeHtmlEntities } from '../utils/security';
import { UserAvatar } from './UserAvatar';
import { calculateUserRatingStats } from '../utils/ratingUtils';

interface HomeDashboardProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditProfile: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartTest,
  onOpenCreateModal,
  onOpenEditProfile,
}) => {
  const {
    profile,
    testPackages,
    mistakes,
    setActiveTab,
    checkDailyStreak,
    testAttempts,
    leaderboard,
  } = useQuizStore();
  const { t } = useTranslation();

  const [dailyClaimedMessage, setDailyClaimedMessage] = useState<string | null>(null);
  const [isCoinFlying, setIsCoinFlying] = useState(false);
  const [coinGlow, setCoinGlow] = useState(false);
  const [isDailyDisappearing, setIsDailyDisappearing] = useState(false);
  const [isVoucherDismissed, setIsVoucherDismissed] = useState(false);

  // Compute rating stats and ranking
  const stats = calculateUserRatingStats(testAttempts);

  const currentUserEntry = {
    id: profile.id,
    scorePoints: stats.scorePoints,
    bestTimeSeconds: stats.bestTimeSeconds,
  };

  const allUsers = [
    ...leaderboard.filter((u) => u.id !== profile.id),
    currentUserEntry,
  ].sort((a, b) => {
    const aPts = a.scorePoints ?? 0;
    const bPts = b.scorePoints ?? 0;
    if (bPts !== aPts) return bPts - aPts;
    return (a.bestTimeSeconds || 180) - (b.bestTimeSeconds || 180);
  });

  const userRank = Math.max(1, allUsers.findIndex((u) => u.id === profile.id) + 1);

  const bestAttemptScore = (testAttempts || []).length > 0
    ? Math.max(...(testAttempts || []).map((a) => a.score))
    : 0;

  // Check if claimed today (24h lockout)
  const today = new Date().toISOString().split('T')[0];
  const isClaimedToday = profile.lastClaimedDailyDate === today;

  // Compute Rank title
  const getRankInfo = (completed: number) => {
    if (completed >= 30) return { title: t.rankMaster, Icon: Crown, color: 'text-amber-300' };
    if (completed >= 15) return { title: t.rankScholar, Icon: Award, color: 'text-indigo-300' };
    if (completed >= 5) return { title: t.rankActive, Icon: Medal, color: 'text-sky-300' };
    return { title: t.rankBeginner, Icon: Award, color: 'text-emerald-300' };
  };

  const rank = getRankInfo(profile.completedTestsCount);

  // Handle daily streak claim with flying coin visual animation and smooth exit
  const handleClaimDailyStreak = () => {
    if (isClaimedToday) {
      setDailyClaimedMessage(t.dailyBonusAlreadyClaimed);
      setTimeout(() => setDailyClaimedMessage(null), 3000);
      return;
    }

    // Trigger visual flying coin
    setIsCoinFlying(true);
    triggerHaptic('medium');

    setTimeout(() => {
      const result = checkDailyStreak();
      setIsCoinFlying(false);
      setCoinGlow(true);

      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.6 },
      });

      setDailyClaimedMessage(`${t.dailyBonusClaimedSuccess} (${result.streakCount})`);

      // Trigger disappearing animation after celebration
      setTimeout(() => {
        setIsDailyDisappearing(true);
      }, 1500);

      setTimeout(() => {
        setCoinGlow(false);
        setDailyClaimedMessage(null);
      }, 3500);
    }, 700);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Floating Animated Coin Particle */}
      {isCoinFlying && (
        <div className="fixed bottom-40 right-10 z-50 pointer-events-none animate-coin-fly flex items-center gap-1 bg-amber-400 text-slate-950 font-black px-2 py-1 rounded-full shadow-2xl border border-white">
          <Coins className="w-5 h-5 fill-slate-950" />
          <span className="text-xs">+1 Coin</span>
        </div>
      )}

      {/* User Greeting & University Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-5 shadow-xl shadow-emerald-600/20">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full bg-orange-400/20 blur-xl pointer-events-none" />

        {/* User Info Header with Avatar, Name, and prominent "Tahrirlash" button */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl border-2 border-white/30 shadow-inner overflow-hidden flex items-center justify-center p-0.5 ring-2 ring-emerald-400/50">
                <UserAvatar avatar={profile.avatar} />
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-md border border-white/50">
                #{userRank}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-emerald-100/80 font-medium">{t.greeting}</p>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                {profile.firstName || 'Talaba'} {profile.lastName || ''}
              </h2>
              <p className="text-[11px] text-emerald-100/90 font-medium truncate mt-0.5">
                {profile.academicYear}{t.courseUnit} • {profile.studyType}
              </p>
            </div>
          </div>

          {/* Prominent "Tahrirlash" Button directly next to user info */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenEditProfile();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md text-white font-bold text-xs shadow-sm transition-all border border-white/25 shrink-0"
            title="Profilni tahrirlash"
          >
            <Edit3 className="w-3.5 h-3.5 text-orange-300" />
            <span>{t.editBtn || 'Tahrirlash'}</span>
          </button>
        </div>

        {/* Context Badges: Tanlagan OTM, Viloyat, O'zbekiston bo'yicha egallagan o'rni */}
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 mt-3.5 pt-3 border-t border-white/15 text-[11px]">
          {/* Tanlangan OTM */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-emerald-100 font-semibold max-w-[200px]">
            <School className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="truncate">{profile.university || 'TATU'}</span>
          </div>

          {/* Viloyati */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-emerald-100 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-orange-300 shrink-0" />
            <span className="truncate">{profile.region}</span>
          </div>

          {/* O'zbekiston bo'yicha o'rni */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/20 backdrop-blur-sm border border-amber-300/40 text-amber-200 font-bold ml-auto sm:ml-0">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>O'zbekistonda: #{userRank}-o'rin</span>
          </div>
        </div>

        {/* 3 Statistika Kartochkalari: Coinlar, To'g'ri yechilgan testlar, Eng yaxshi natija */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-white/15 text-center">
          {/* 1. Coinlar balansi */}
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 transition-all ${coinGlow ? 'ring-2 ring-orange-400 scale-105 shadow-lg' : ''}`}>
            <div className="flex items-center justify-center gap-1 text-orange-300 font-black text-base sm:text-lg">
              <Coins className={`w-4 h-4 fill-orange-300 ${coinGlow ? 'animate-bounce' : ''}`} />
              <span>{profile.coins}</span>
            </div>
            <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-bold mt-0.5">
              {t.coins}
            </p>
          </div>

          {/* 2. To'g'ri yechilgan testlar / savollar soni */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-emerald-200 font-black text-base sm:text-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{stats.totalCorrectAnswers > 0 ? stats.totalCorrectAnswers : profile.completedTestsCount}</span>
            </div>
            <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-bold mt-0.5 truncate">
              {stats.totalCorrectAnswers > 0 ? "To'g'ri javoblar" : "Yechilgan test"}
            </p>
          </div>

          {/* 3. Eng yaxshi natija */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-amber-300 font-black text-base sm:text-lg">
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300/30" />
              <span>{bestAttemptScore > 0 ? `${bestAttemptScore}/25` : `${stats.scorePoints} ball`}</span>
            </div>
            <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-bold mt-0.5 truncate">
              Eng yaxshi natija
            </p>
          </div>
        </div>
      </div>

      {/* Daily Streak & Interactive Bonus Card - Disappears upon claim with animation & hidden today */}
      {(!isClaimedToday || isDailyDisappearing) && (
        <div
          className={`bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-500/15 dark:to-amber-500/10 border border-orange-500/20 rounded-2xl p-3.5 flex items-center justify-between transition-all duration-700 ease-in-out ${
            isDailyDisappearing
              ? 'opacity-0 -translate-y-4 scale-95 max-h-0 py-0 my-0 border-0 overflow-hidden pointer-events-none'
              : 'max-h-40 opacity-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.dailyBonusTitle}
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400">
                  {profile.streak} {t.streak}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t.dailyBonusDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isClaimedToday || isCoinFlying}
            onClick={handleClaimDailyStreak}
            className={`px-3 py-2 rounded-xl font-bold text-xs shadow-md transition-all transform active:scale-95 flex items-center gap-1 shrink-0 ${
              isClaimedToday
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isClaimedToday ? t.claimedToday : t.claimDailyBonus}</span>
          </button>
        </div>
      )}

      {/* Interactive Toast Message */}
      {dailyClaimedMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center shadow-lg animate-in fade-in zoom-in-95">
          {dailyClaimedMessage}
        </div>
      )}

      {/* 100% Free Access Platform Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-500/15 dark:to-indigo-500/15 border border-emerald-500/25 dark:border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-slate-900 dark:text-white">
                {t.allTestsFreeTitle}
              </h3>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {t.unlimitedBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              {t.allTestsFreeDesc}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('tests');
          }}
          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1 shrink-0 transition-transform active:scale-95"
        >
          <span>{t.practiceBtn}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('tests');
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-emerald-400 text-left transition-all group active:scale-[0.98] min-h-[96px] flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.navTests}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              {t.testCategoriesPractice}
            </p>
          </div>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCreateModal();
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-orange-400 text-left transition-all group active:scale-[0.98] min-h-[96px] flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.createTestBtn}</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
              {t.bulkParserDesc}
            </p>
          </div>
        </button>
      </div>

      {/* Mistakes Notice if any */}
      {mistakes.length > 0 && (
        <div
          onClick={() => setActiveTab('results')}
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200">
                {t.mistakesTitle} ({mistakes.length})
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                {t.mistakesDesc}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        </div>
      )}

      {/* Recommended Tests - Only shown if active test packages exist */}
      {testPackages.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              {t.recommendedTests}
            </h3>
            <button
              onClick={() => setActiveTab('tests')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
            >
              {t.all} &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {testPackages.slice(0, 3).map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => onStartTest(pkg, pkg.blocks[0]?.id || '')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900/70 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {decodeHtmlEntities(pkg.title)}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{decodeHtmlEntities(pkg.university || '')}</span>
                      <span>•</span>
                      <span>{pkg.blocks.length} {t.blocksCount} ({pkg.totalQuestions} {t.questionsCount})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <span>{t.start}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
