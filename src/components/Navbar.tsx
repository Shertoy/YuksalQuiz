import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { Language } from '../i18n/translations';
import { Moon, Sun, Volume2, VolumeX, ShieldAlert, Sparkles, Globe, Bell } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface NavbarProps {
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNotifications }) => {
  const { theme, setTheme, soundEnabled, toggleSound, tamperDetected, resetTamperWarning, setActiveTab, announcements } = useQuizStore();
  const { language, setLanguage } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const handleThemeToggle = () => {
    triggerHaptic('light');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageChange = (lang: Language) => {
    triggerHaptic('selection');
    setLanguage(lang);
    setIsLangMenuOpen(false);
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

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 transition-colors">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-base tracking-tight bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-sky-400 dark:to-teal-300">
                  YuksalQuiz
                </h1>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
                  v2.0
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
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
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
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{lang === 'uz' ? "O'zbek" : lang === 'ru' ? 'Русский' : 'English'}</span>
                        {language === lang && <span className="text-[10px]">✓</span>}
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
                <Volume2 className="w-4 h-4 text-indigo-500" />
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
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Notifications Trigger */}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenNotifications();
                }}
                className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 transition-colors relative"
                title="Bildirishnomalar va Yangiliklar"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-indigo-500" />
                {announcements && announcements.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                    {announcements.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
