import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { Home, BookOpen, Trophy, Wallet, User } from 'lucide-react';
import { TabType } from '../types';

interface NavItem {
  id: TabType;
  labelKey: 'navHome' | 'navTests' | 'navWallet' | 'navRating' | 'navProfile';
  icon: React.ComponentType<{ className?: string }>;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useQuizStore();
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { id: 'home', labelKey: 'navHome', icon: Home },
    { id: 'tests', labelKey: 'navTests', icon: BookOpen },
    { id: 'wallet', labelKey: 'navWallet', icon: Wallet },
    { id: 'leaderboard', labelKey: 'navRating', icon: Trophy },
    { id: 'profile', labelKey: 'navProfile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 pb-safe transition-colors">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const label = t[item.labelKey];

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
