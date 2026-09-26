import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { Moon, Sun, Volume2, VolumeX, Flame, Coins, ShieldAlert, Wallet, User } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { UserAvatar } from './UserAvatar';

export const Navbar: React.FC = () => {
  const { theme, setTheme, profile, soundEnabled, toggleSound, tamperDetected, resetTamperWarning, setActiveTab } = useQuizStore();

  const handleThemeToggle = () => {
    triggerHaptic('light');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {tamperDetected && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Xavfsizlik ogohlantirishi: Mahalliy xotirada ruxsatsiz o'zgarish aniqlandi va profil tiklandi.</span>
          </div>
          <button
            onClick={resetTamperWarning}
            className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded font-bold hover:bg-slate-800"
          >
            OK
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 px-3.5 py-2.5 transition-colors">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <span className="text-lg">🎓</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-sky-300">
                  YuksalQuiz
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  HEMIS
                </span>
              </div>
            </div>
          </div>

          {/* Stats & Quick Controls */}
          <div className="flex items-center gap-1.5">
            {/* Wallet Button */}
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('wallet');
              }}
              className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/25 px-2 py-1 rounded-full text-emerald-700 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-500/20 transition-all"
              title="Talaba Hamyoni"
            >
              <Wallet className="w-3 h-3 text-emerald-500" />
              <span>{((profile.voucherBalance + profile.walletBalance) / 1000).toFixed(0)}k</span>
            </button>

            {/* Coins */}
            <div
              className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 px-2 py-1 rounded-full text-amber-700 dark:text-amber-300 font-bold text-[11px]"
              title="Yuksal Tangalari"
            >
              <Coins className="w-3 h-3 text-amber-500 animate-bounce" />
              <span>{profile.coins}</span>
            </div>

            {/* Streak */}
            <div
              className="hidden sm:flex items-center gap-1 bg-orange-500/10 dark:bg-orange-400/15 border border-orange-500/20 px-2 py-1 rounded-full text-orange-700 dark:text-orange-300 font-bold text-[11px]"
              title="Kundalik seriya (Streak)"
            >
              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
              <span>{profile.streak}k</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                triggerHaptic('light');
                toggleSound();
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 transition-colors"
              title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
              aria-label="Sound Toggle"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 transition-colors"
              title="Mavzuni almashtirish"
              aria-label="Theme Toggle"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>

            {/* Profile avatar link */}
            <button
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('profile');
              }}
              className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-sm overflow-hidden p-0.5 active:scale-95 transition-all"
              title="Mening Profilim"
            >
              <UserAvatar avatar={profile.avatar} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
