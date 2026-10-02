import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { TabType } from '../types';
import { triggerHaptic } from '../utils/telegram';

// 1. Ultra-Modern Home Icon (Dashboard + Smart Spark)
const ModernHomeIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <svg className="w-5 h-5 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
    {isActive ? (
      <>
        <path
          d="M3 10.5L12 3l9 7.5v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z"
          className="fill-emerald-500/20 dark:fill-emerald-400/30 stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 21V11.5a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5V21"
          className="fill-emerald-600 dark:fill-emerald-400"
        />
        <circle cx="12" cy="7.5" r="1.3" className="fill-orange-500 dark:fill-orange-400" />
      </>
    ) : (
      <>
        <path
          d="M3 10.5L12 3l9 7.5v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 21V12a1 1 0 011-1h4a1 1 0 011 1v9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </svg>
);

// 2. Ultra-Modern Test Icon (Exam Sheet + Verification Checkmark)
const ModernTestsIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <svg className="w-5 h-5 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
    {isActive ? (
      <>
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="3.5"
          className="fill-emerald-500/20 dark:fill-emerald-400/30 stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="2"
        />
        <path
          d="M7 8h10M7 12h5"
          className="stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 13.5l2 2 4-4"
          className="stroke-orange-500 dark:stroke-orange-400"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="3.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M7.5 8h9M7.5 12h6M7.5 16h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

// 3. Ultra-Modern Wallet Icon (Digital Card & Coin Clasp)
const ModernWalletIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <svg className="w-5 h-5 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
    {isActive ? (
      <>
        <path
          d="M2.5 7.5A2.5 2.5 0 015 5h14a2.5 2.5 0 012.5 2.5v1H4.5a2 2 0 00-2 2v7.5a2 2 0 002 2H19a2.5 2.5 0 002.5-2.5V9"
          className="fill-emerald-500/20 dark:fill-emerald-400/30 stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="13.5"
          y="10.5"
          width="8"
          height="6"
          rx="2"
          className="fill-orange-400 stroke-orange-500"
          strokeWidth="1.5"
        />
        <circle cx="17.5" cy="13.5" r="1" className="fill-slate-950" />
      </>
    ) : (
      <>
        <path
          d="M2.5 7.5A2.5 2.5 0 015 5h14a2.5 2.5 0 012.5 2.5v1H4.5a2 2 0 00-2 2v7.5a2 2 0 002 2H19a2.5 2.5 0 002.5-2.5V9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect
          x="14"
          y="10.5"
          width="7"
          height="6"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="17.5" cy="13.5" r="0.75" fill="currentColor" />
      </>
    )}
  </svg>
);

// 4. Ultra-Modern Rating Icon (Olympic Trophy & Radiant Crown)
const ModernRatingIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <svg className="w-5 h-5 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
    {isActive ? (
      <>
        <path
          d="M6 9V4h12v5a6 6 0 01-12 0z"
          className="fill-orange-400/25 stroke-orange-500"
          strokeWidth="2"
        />
        <path
          d="M6 5H3a2 2 0 00-2 2v1a4 4 0 004 4h1M18 5h3a2 2 0 012 2v1a4 4 0 01-4 4h-1"
          className="stroke-orange-500"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 15v4M8 21h8"
          className="stroke-orange-500"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <polygon points="12,6.5 13,8.5 15,8.8 13.5,10.2 14,12.2 12,11.2 10,12.2 10.5,10.2 9,8.8 11,8.5" className="fill-orange-400" />
      </>
    ) : (
      <>
        <path
          d="M6 9V4h12v5a6 6 0 01-12 0z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M6 5H3a2 2 0 00-2 2v1a4 4 0 004 4h1M18 5h3a2 2 0 012 2v1a4 4 0 01-4 4h-1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 15v4M8 21h8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

// 5. Ultra-Modern Profile Icon (Student Avatar & Verification Badge)
const ModernProfileIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <svg className="w-5 h-5 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
    {isActive ? (
      <>
        <circle
          cx="12"
          cy="7"
          r="4"
          className="fill-emerald-500/30 dark:fill-emerald-400/40 stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="2"
        />
        <path
          d="M4 21v-2a6 6 0 0112-2.5"
          className="stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="18" r="3" className="fill-orange-500" />
        <path d="M17 18l.8.8 1.4-1.6" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4 21v-2a7 7 0 0114 0v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

interface NavItem {
  id: TabType;
  labelKey: 'navHome' | 'navTests' | 'navWallet' | 'navRating' | 'navProfile';
  icon: React.ComponentType<{ isActive: boolean }>;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useQuizStore();
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { id: 'home', labelKey: 'navHome', icon: ModernHomeIcon },
    { id: 'tests', labelKey: 'navTests', icon: ModernTestsIcon },
    { id: 'leaderboard', labelKey: 'navRating', icon: ModernRatingIcon },
    { id: 'profile', labelKey: 'navProfile', icon: ModernProfileIcon },
  ];

  // Map sub-tabs like 'results' or 'wallet' to 'profile' or 'home'
  const resolvedTab = activeTab === 'results' ? 'profile' : activeTab === 'wallet' ? 'home' : activeTab;
  const activeIndex = Math.max(0, navItems.findIndex((item) => item.id === resolvedTab));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-safe transition-colors shadow-2xl">
      <div className="max-w-md mx-auto px-2 py-1">
        {/* Inner container with exact shared coordinate system */}
        <div className="relative flex items-center justify-around">
          {/* Liquid Sliding Pill Indicator - Mathematically identical alignment with buttons */}
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
                }}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center h-[50px] rounded-2xl transition-colors duration-200 active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  <Icon isActive={isActive} />
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
