import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { TabType } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { Home, BookOpen, Trophy, User, Wallet } from 'lucide-react';

interface NavItem {
  id: TabType;
  labelKey: 'navHome' | 'navTests' | 'navWallet' | 'navRating' | 'navProfile';
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export interface BottomNavProps {
  onTabSelect?: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onTabSelect }) => {
  const { activeTab, setActiveTab } = useQuizStore();
  const { t, tr } = useTranslation();

  const navItems: NavItem[] = [
    { id: 'home', labelKey: 'navHome', icon: Home },
    { id: 'tests', labelKey: 'navTests', icon: BookOpen },
    { id: 'wallet', labelKey: 'navWallet', icon: Wallet },
    { id: 'leaderboard', labelKey: 'navRating', icon: Trophy },
    { id: 'profile', labelKey: 'navProfile', icon: User },
  ];

  // Map sub-tabs like 'results' to 'profile'
  const resolvedTab = activeTab === 'results' ? 'profile' : activeTab;
  const activeIndex = Math.max(0, navItems.findIndex((item) => item.id === resolvedTab));

  return (
    <nav
      aria-label={tr('Asosiy menyu', 'Главное меню', 'Main menu')}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pb-safe"
    >
      <div className="max-w-md mx-auto px-2 pt-1.5 pb-1 flex items-stretch justify-around">
        {navItems.map((item, idx) => {
          const isActive = idx === activeIndex;
          const Icon = item.icon;
          const label = t[item.labelKey];

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab(item.id);
                onTabSelect?.(item.id);
              }}
              className="group flex-1 min-h-[52px] flex flex-col items-center justify-center gap-1 select-none"
            >
              <span
                className={`flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-200 ease-[var(--ease-out)] group-active:scale-95 ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-[22px] h-[22px] ${
                    isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                  strokeWidth={isActive ? 2 : 1.75}
                />
              </span>
              <span
                className={`text-[11px] leading-none ${
                  isActive
                    ? 'font-bold text-emerald-700 dark:text-emerald-300'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
