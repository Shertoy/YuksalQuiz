import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  Coins,
  Flame,
  Award,
  BookOpen,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
  School,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/telegram';
import { TestPackage } from '../types';

interface HomeDashboardProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartTest,
  onOpenCreateModal,
}) => {
  const { profile, testPackages, mistakes, setActiveTab, checkDailyStreak } = useQuizStore();
  const [dailyClaimedMessage, setDailyClaimedMessage] = useState<string | null>(null);

  // Compute Rank title
  const getRankInfo = (completed: number) => {
    if (completed >= 30) return { title: 'Yuksalish Masteri', icon: '👑', color: 'from-amber-500 to-yellow-400' };
    if (completed >= 15) return { title: 'Bilimdon Talaba', icon: '🥇', color: 'from-indigo-500 to-purple-500' };
    if (completed >= 5) return { title: 'Faol Izlanuvchi', icon: '🥈', color: 'from-sky-500 to-cyan-400' };
    return { title: 'Boshlang\'ich Talaba', icon: '🥉', color: 'from-emerald-500 to-teal-400' };
  };

  const rank = getRankInfo(profile.completedTestsCount);

  // Handle daily streak claim
  const handleClaimDailyStreak = () => {
    const result = checkDailyStreak();
    if (result.streakAwarded) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      setDailyClaimedMessage(`Tabriklaymiz! +1 tanga hisobingizga qo'shildi (${result.streakCount}-kun)`);
    } else {
      setDailyClaimedMessage('Bugungi bonus allaqachon olingan. Ertaga yana tashrif buyuring!');
    }
    setTimeout(() => setDailyClaimedMessage(null), 3500);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* User Greeting & University Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white p-5 shadow-xl shadow-indigo-600/20">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="text-4xl bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-inner">
              {profile.avatar}
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-medium">Assalomu alaykum,</p>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {profile.firstName || 'Talaba'} {profile.lastName || ''}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-100 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{profile.region}</span>
                <span>•</span>
                <span>{profile.academicYear}-kurs</span>
                <span>•</span>
                <span>{profile.studyType}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-2.5 py-1 rounded-xl transition-all"
          >
            Profil
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-white/15 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-amber-300 font-black text-lg">
              <Coins className="w-4 h-4 fill-amber-300" />
              <span>{profile.coins}</span>
            </div>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">
              Tangalar
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-sky-300 font-black text-lg">
              <BookOpen className="w-4 h-4" />
              <span>{profile.completedTestsCount}</span>
            </div>
            <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold">
              Yechilgan
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

      {/* Daily Streak & Bonus Card */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-500/15 dark:to-amber-500/10 border border-orange-500/20 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/30">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Kundalik Seriya (Streak)
              </h3>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400">
                {profile.streak} kun
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Har kuni kiring va +1 tanga bonusga ega bo'ling
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            handleClaimDailyStreak();
          }}
          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition-all transform active:scale-95 flex items-center gap-1 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Olish</span>
        </button>
      </div>

      {/* 35 000 UZS Voucher & Wallet Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/25 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                35 000 so'm Boshlang'ich Vaucher
              </h3>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Mavjud
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Obunalar uchun avtomatik chegirib beriladi
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            setActiveTab('wallet');
          }}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all transform active:scale-95 shrink-0"
        >
          Hamyon &rarr;
        </button>
      </div>

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
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">Testlar Banki</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            OTM fanlari bo'yicha mashq
          </p>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCreateModal();
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-400 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">Yangi Test Yaratish</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            O'zingiz test tuzing
          </p>
        </button>
      </div>

      {/* Mistakes Alert banner if any */}
      {mistakes.length > 0 && (
        <div
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('results');
          }}
          className="cursor-pointer bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 flex items-center justify-between transition-all hover:border-rose-400"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Xatolar ustida ishlash
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold">
                  {mistakes.length} ta
                </span>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                10 talik maxsus mashg'ulot bilan xatolaringizni to'g'rilang
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-500" />
        </div>
      )}

      {/* Featured / Popular University Tests */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <School className="w-4 h-4 text-indigo-500" />
            <span>Tavsiya etiladigan testlar</span>
          </h3>
          <button
            onClick={() => setActiveTab('tests')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:underline"
          >
            <span>Barchasi</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {testPackages.slice(0, 3).map((pkg) => {
            const firstUnlockedBlock = pkg.blocks.find((b) => !b.isLocked) || pkg.blocks[0];

            return (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-indigo-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {pkg.department}
                      </span>
                      {!pkg.isPublic && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Yopiq</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {pkg.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {pkg.university}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      onStartTest(pkg, firstUnlockedBlock.id);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1 transition-all"
                  >
                    <span>Boshlash</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Blocks preview pills */}
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Bo'limlar:</span>
                  {pkg.blocks.map((b) => (
                    <span
                      key={b.id}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                        b.isLocked
                          ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400'
                          : b.isPassed
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                          : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {b.isLocked && <Lock className="w-2.5 h-2.5" />}
                      <span>{b.title}</span>
                      {b.bestScore !== undefined && b.bestScore > 0 && (
                        <span>({b.bestScore})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
