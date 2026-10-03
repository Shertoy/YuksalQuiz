import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { Language } from '../i18n/translations';
import { Moon, Sun, Volume2, VolumeX, ShieldAlert, Sparkles, Globe, Bell, Check, Lock } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { isAnnouncementForUser } from '../utils/announcements';

interface NavbarProps {
  onOpenNotifications?: () => void;
  onOpenAdminLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNotifications, onOpenAdminLogin }) => {
  const {
    theme,
    setTheme,
    soundEnabled,
    toggleSound,
    tamperDetected,
    resetTamperWarning,
    profile,
    setActiveTab,
    announcements,
    readAnnouncementIds,
    markAnnouncementsAsRead,
  } = useQuizStore();
  const { language, setLanguage } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Compute unread announcements count for current user
  const unreadAnnouncements = (announcements || []).filter(
    (a) => isAnnouncementForUser(a, profile) && !(readAnnouncementIds || []).includes(a.id)
  );
  const unreadCount = unreadAnnouncements.length;

  const handleThemeToggle = () => {
    triggerHaptic('light');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageChange = (lang: Language) => {
    triggerHaptic('selection');
    setLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const handleOpenNotifications = () => {
    triggerHaptic('light');
    markAnnouncementsAsRead();
    onOpenNotifications?.();
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

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 dark:bg-[#030712]/85 border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 transition-colors">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Clean Modern Logo & Brand */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
              <Sparkles className="w-4 h-4 text-orange-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-base tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-orange-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-orange-400">
                  YuksalQuiz
                </h1>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
                  v1.0
                </span>
              </div>
            </div>
          </button>

          {/* Clean Controls: Language + Sound + Theme */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsLangMenuOpen(!isLangMenuOpen);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                title="Tilni o'zgartirish"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="uppercase text-[11px] font-black">{language}</span>
              </button>

              {/* Language Dropdown Menu */}
              {isLangMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 z-50 w-28 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95">
                    {(['uz', 'ru', 'en'] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full px-3 py-1.5 text-left text-xs font-bold flex items-center justify-between transition-colors ${
                          language === lang
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{lang === 'uz' ? "O'zbek" : lang === 'ru' ? 'Русский' : 'English'}</span>
                        {language === lang && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                toggleSound();
              }}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
              title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
              aria-label="Sound Toggle"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
              title="Mavzuni almashtirish"
              aria-label="Theme Toggle"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-orange-400" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600" />
              )}
            </button>

            {/* Notifications Trigger */}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={handleOpenNotifications}
                className="p-2 rounded-xl text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700/80 transition-colors relative"
                title="Bildirishnomalar va Yangiliklar"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-orange-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 px-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm animate-in zoom-in-75">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Desktop Web Admin Access Button */}
            {onOpenAdminLogin && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenAdminLogin();
                }}
                className="hidden sm:flex p-2 rounded-xl text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700/80 transition-colors"
                title="Admin Paneli (Veb orqali)"
                aria-label="Admin Login"
              >
                <Lock className="w-4 h-4 text-slate-500 hover:text-emerald-500" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
