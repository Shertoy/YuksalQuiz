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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/telegram';
import { TestPackage } from '../types';
import { UserAvatar } from './UserAvatar';

interface HomeDashboardProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartTest,
  onOpenCreateModal,
}) => {
  const { profile, testPackages, mistakes, setActiveTab, checkDailyStreak } = useQuizStore();
  const { t } = useTranslation();

  const [dailyClaimedMessage, setDailyClaimedMessage] = useState<string | null>(null);
  const [isCoinFlying, setIsCoinFlying] = useState(false);
  const [coinGlow, setCoinGlow] = useState(false);
  const [isDailyDisappearing, setIsDailyDisappearing] = useState(false);
  const [isVoucherDismissed, setIsVoucherDismissed] = useState(false);

  // Check if claimed today (24h lockout)
  const today = new Date().toISOString().split('T')[0];
  const isClaimedToday = profile.lastClaimedDailyDate === today;

  // Compute Rank title
  const getRankInfo = (completed: number) => {
    if (completed >= 30) return { title: 'Yuksalish Masteri', icon: '👑', color: 'from-amber-500 to-yellow-400' };
    if (completed >= 15) return { title: 'Bilimdon Talaba', icon: '🥇', color: 'from-indigo-500 to-purple-500' };
    if (completed >= 5) return { title: 'Faol Izlanuvchi', icon: '🥈', color: 'from-sky-500 to-cyan-400' };
    return { title: 'Boshlang\'ich Talaba', icon: '🥉', color: 'from-emerald-500 to-teal-400' };
  };

  const rank = getRankInfo(profile.completedTestsCount);

  // Handle daily streak claim with flying coin visual animation and smooth exit
  const handleClaimDailyStreak = () => {
    if (isClaimedToday) {
      setDailyClaimedMessage('Bugungi bonus allaqachon olingan. Ertaga yana tashrif buyuring!');
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

      setDailyClaimedMessage(`Tabriklaymiz! +1 tanga hisobingizga qo'shildi (${result.streakCount}-kunlik seriya)`);

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white p-5 shadow-xl shadow-indigo-600/20">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner overflow-hidden flex items-center justify-center p-0.5 shrink-0">
              <UserAvatar avatar={profile.avatar} />
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-medium">{t.greeting}</p>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {profile.firstName || 'Talaba'} {profile.lastName || ''}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-100 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{profile.region}</span>
                <span>•</span>
                <span>{profile.academicYear}{t.courseUnit}</span>
                <span>•</span>
                <span>{profile.studyType}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2.5 py-1 rounded-xl transition-all"
          >
            {t.navProfile}
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/15 text-center">
          <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-2.5 transition-all ${coinGlow ? 'ring-2 ring-amber-400 scale-105 shadow-lg' : ''}`}>
            <div className="flex items-center justify-center gap-1 text-amber-300 font-black text-lg">
              <Coins className={`w-4 h-4 fill-amber-300 ${coinGlow ? 'animate-bounce' : ''}`} />
              <span>{profile.coins}</span>
            </div>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">
              {t.coins}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-sky-300 font-black text-lg">
              <BookOpen className="w-4 h-4" />
              <span>{profile.completedTestsCount}</span>
            </div>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">
              {t.testsCompleted}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-emerald-300 font-black text-lg">
              <span>{rank.icon}</span>
            </div>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold truncate">
              {rank.title}
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

      {/* Action Voucher Card - Only shown if voucher > 0, no active subscription, and not dismissed */}
      {profile.voucherBalance > 0 &&
        (!profile.subscriptionPlan || profile.subscriptionPlan === 'none') &&
        !isVoucherDismissed && (
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-4 shadow-xl shadow-indigo-950/20 space-y-3 relative overflow-hidden border border-indigo-700/50 animate-in fade-in">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full bg-emerald-400/20 blur-xl pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/25 shrink-0 mt-0.5">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold text-white">
                      35 000 so'm vaucheringiz faol!
                    </h3>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 uppercase">
                      Faol
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-100 leading-relaxed font-medium">
                    6 oylik obunani ochish uchun yana 15 000 so'm to'lang yoki 10 ta do'stingizni taklif qiling.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsVoucherDismissed(true);
                }}
                className="p-1 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-colors ml-2 shrink-0"
                title="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 relative z-10">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setActiveTab('wallet');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <span>{t.activateOfferBtn}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('tests');
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.navTests}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            5 ta kategoriya bo'yicha mashq
          </p>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCreateModal();
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t.createTestBtn}</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Bulk parser (==== va ++++)
          </p>
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
                Xatolar ustida ishlash ({mistakes.length} ta)
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Noto'g'ri yechilgan savollarni qayta ishlab chiqing
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        </div>
      )}

      {/* Recent / Recommended Tests */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            Tavsiya etilgan testlar
          </h3>
          {testPackages.length > 0 && (
            <button
              onClick={() => setActiveTab('tests')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Barchasi &rarr;
            </button>
          )}
        </div>

        {testPackages.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Hozircha testlar mavjud emas
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs mx-auto leading-relaxed">
              Ilk testni o'zingiz tuzing! Boshqa talabalar testingizni yechganda har bir urinish uchun sizga +100 so'm rag'batlantirish mablag'i to'lanadi.
            </p>
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenCreateModal();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Yangi test tuzish</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {testPackages.slice(0, 3).map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => onStartTest(pkg, pkg.blocks[0]?.id || '')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/70 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {pkg.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span>{pkg.university}</span>
                      <span>•</span>
                      <span>{pkg.blocks.length} blok ({pkg.totalQuestions} savol)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  <span>Boshlash</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
