import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { Home, BookOpen, CheckSquare, Trophy, Wallet } from 'lucide-react';
import { TabType } from '../types';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, mistakes } = useQuizStore();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Bosh sahifa', icon: Home },
    { id: 'tests', label: 'Testlar', icon: BookOpen },
    { id: 'wallet', label: 'Hamyon', icon: Wallet },
    {
      id: 'results',
      label: 'Natijalarim',
      icon: CheckSquare,
      badge: mistakes.length > 0 ? mistakes.length : undefined,
    },
    { id: 'leaderboard', label: 'Reyting', icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-safe transition-colors">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

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
              {/* Badge for Mistakes */}
              {item.badge !== undefined && (
                <span className="absolute top-0.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center shadow-sm">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
