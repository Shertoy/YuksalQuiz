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
  const { t } = useTranslation();

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#030712]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-safe transition-colors shadow-2xl">
      <div className="max-w-md mx-auto px-2 py-1">
        {/* Inner container with exact shared coordinate system */}
        <div className="relative flex items-center justify-around">
          {/* Liquid Sliding Pill Indicator */}
          <div
            className="absolute inset-y-0 transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none flex items-center justify-center z-0"
            style={{
              width: `${100 / navItems.length}%`,
              left: 0,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            <div className="w-[88%] max-w-[58px] h-[46px] rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-400/40 dark:border-emerald-400/45 shadow-sm shadow-emerald-500/15 backdrop-blur-md" />
          </div>

          {/* Navigation Item Buttons */}
          {navItems.map((item) => {
            const isActive = resolvedTab === item.id;
            const Icon = item.icon;
            const label = t[item.labelKey];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveTab(item.id);
                  onTabSelect?.(item.id);
                }}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center h-[50px] rounded-2xl transition-colors duration-200 active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.75}
                  />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                    isActive
                      ? 'font-black text-emerald-600 dark:text-emerald-400'
                      : 'font-medium'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
