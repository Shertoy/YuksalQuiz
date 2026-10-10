import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { ShieldAlert, Bell } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { triggerHaptic } from '../utils/telegram';
import { isAnnouncementForUser } from '../utils/announcements';

interface NavbarProps {
  onOpenNotifications?: () => void;
  onOpenAdminLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNotifications }) => {
  const {
    tamperDetected,
    resetTamperWarning,
    profile,
    setActiveTab,
    announcements,
    readAnnouncementIds,
    markAnnouncementsAsRead,
  } = useQuizStore();
  const { tr } = useTranslation();

  // Compute unread announcements count for current user
  const unreadAnnouncements = (announcements || []).filter(
    (a) => isAnnouncementForUser(a, profile) && !(readAnnouncementIds || []).includes(a.id)
  );
  const unreadCount = unreadAnnouncements.length;


  const handleOpenNotifications = () => {
    triggerHaptic('light');
    markAnnouncementsAsRead();
    onOpenNotifications?.();
  };

  return (
    <>
      {tamperDetected && (
        <div role="alert" className="bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border-b border-amber-200 dark:border-amber-900 px-4 py-2.5 text-xs font-medium">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">
              {tr(
                "Profil ma'lumotlarida o'zgarish aniqlandi va ular tiklandi.",
                'Обнаружено изменение данных профиля, они восстановлены.',
                'A change to your profile data was detected and restored.'
              )}
            </span>
            <button
              type="button"
              onClick={resetTamperWarning}
              className="shrink-0 min-h-[32px] px-3 rounded-lg bg-amber-900 dark:bg-amber-200 text-white dark:text-amber-950 font-bold"
            >
              {tr('Tushunarli', 'Понятно', 'Got it')}
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4">
        <div className="max-w-md mx-auto h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 min-h-[44px] -ml-1 pl-1 pr-2 rounded-xl text-left active:opacity-70 transition-opacity"
            aria-label={tr('YuksalQuiz — bosh sahifa', 'YuksalQuiz — главная', 'YuksalQuiz — home')}
          >
            <img src="/logo.svg" alt="" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-extrabold text-[17px] tracking-[-0.02em] text-slate-900 dark:text-slate-50">
              Yuksal<span className="text-emerald-700 dark:text-emerald-300">Quiz</span>
            </span>
          </button>

          {onOpenNotifications && (
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative w-11 h-11 -mr-1.5 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 active:bg-slate-200/70 dark:active:bg-slate-800 transition-colors"
              aria-label={
                unreadCount > 0
                  ? tr(`Bildirishnomalar, ${unreadCount} ta yangi`, `Уведомления: ${unreadCount} новых`, `Notifications, ${unreadCount} new`)
                  : tr('Bildirishnomalar', 'Уведомления', 'Notifications')
              }
            >
              <Bell className="w-[22px] h-[22px]" strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-orange-600 text-white font-bold text-[10px] leading-4 text-center ring-2 ring-slate-50 dark:ring-slate-950 tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>
    </>
  );
};
