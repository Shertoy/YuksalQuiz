import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  ShieldCheck,
  Coins,
  Flame,
  Edit3,
  Check,
  BookOpen,
  Lock,
  ScrollText,
  CheckSquare,
  ChevronRight,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Vibrate,
  Wallet,
  PlusCircle,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { PublicOfferModal } from './PublicOfferModal';
import { UserAvatar } from './UserAvatar';
import { ReferralShareCard } from './ReferralShareCard';

interface ProfileViewProps {
  onOpenAdminLogin?: () => void;
  onOpenEditProfile?: () => void;
  onOpenReceiptModal?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenAdminLogin,
  onOpenEditProfile,
  onOpenReceiptModal,
}) => {
  const {
    profile,
    setActiveTab,
    soundEnabled,
    toggleSound,
    vibrationEnabled,
    toggleVibration,
    theme,
    setTheme,
  } = useQuizStore();
  const { t, language, setLanguage } = useTranslation();
  const [showOfertaModal, setShowOfertaModal] = useState(false);

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const row =
    'w-full flex items-center gap-3 px-4 min-h-[56px] text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800/60';

  return (
    <div className="space-y-5 pb-28">
      <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-50">{t.profileTitle}</h2>

      {/* Profil */}
      <section className={`${card} p-4`}>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenEditProfile?.();
            }}
            className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0"
            aria-label={t.editProfileBtn || 'Profilni tahrirlash'}
          >
            <UserAvatar avatar={profile.avatar} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold leading-snug text-slate-900 dark:text-slate-50 truncate">
              {profile.firstName || 'Talaba'} {profile.lastName || ''}
            </h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 truncate">{profile.university || '—'}</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
              {[`${profile.academicYear}${t.courseUnit}`, profile.studyType, profile.region].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenEditProfile?.();
          }}
          className="mt-4 w-full min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-[14px] inline-flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" strokeWidth={1.75} />
          <span>{t.editProfileBtn || 'Profilni tahrirlash'}</span>
        </button>

        <div className="mt-4 pt-3 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 text-center">
          <div>
            <div className="text-[17px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{profile.coins ?? 0}</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{t.coins}</div>
          </div>
          <div>
            <div className="text-[17px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {profile.streak} {t.daysUnit || 'kun'}
            </div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{t.streak}</div>
          </div>
          <div>
            <div className="text-[17px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {profile.completedTestsCount ?? 0}
            </div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{t.testsCompleted}</div>
          </div>
        </div>
      </section>

      {/* Hisob va natijalar */}
      <section className={`${card} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
        <div className="flex items-center gap-3 px-4 min-h-[64px]">
          <Wallet className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('wallet');
            }}
            className="min-w-0 flex-1 text-left py-2"
          >
            <span className="block text-[13px] text-slate-500 dark:text-slate-400">Hisobingiz</span>
            <span className="block text-[15px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {(profile.walletBalance || 0).toLocaleString('uz-UZ')} so'm
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenReceiptModal?.();
            }}
            className="shrink-0 min-h-[40px] px-4 rounded-xl border border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold text-[13px] active:bg-emerald-50 dark:active:bg-emerald-950"
          >
            To'ldirish
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('results');
          }}
          className={row}
        >
          <CheckSquare className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 py-3">
            <span className="block text-[15px] font-semibold text-slate-900 dark:text-slate-50">{t.myResultsCardTitle}</span>
            <span className="block text-[13px] text-slate-500 dark:text-slate-400">{t.myResultsCardDesc}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
        </button>
      </section>

      {/* Do'stlarni taklif qilish */}
      <ReferralShareCard userId={profile.id} />

      {/* Sozlamalar */}
      <section className="space-y-2">
        <h3 className="px-1 text-[15px] font-semibold text-slate-900 dark:text-slate-50">{t.settingsTitle}</h3>
        <div className={`${card} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-slate-900 dark:text-slate-50">{t.languageTitle}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800">
              {(
                [
                  { code: 'uz', label: t.langUz },
                  { code: 'ru', label: t.langRu },
                  { code: 'en', label: t.langEn },
                ] as const
              ).map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <button
                    key={langItem.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      triggerHaptic('selection');
                      setLanguage(langItem.code);
                    }}
                    className={`min-h-[36px] rounded-lg text-[13px] font-semibold transition-colors ${
                      isSelected
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 shadow-[0_1px_2px_rgba(28,25,23,0.08)]'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {langItem.label}
                  </button>
                );
              })}
            </div>
          </div>

          {[
            {
              key: 'sound',
              icon: soundEnabled ? Volume2 : VolumeX,
              title: t.soundEffectsTitle,
              on: soundEnabled,
              toggle: () => toggleSound(),
            },
            {
              key: 'vibration',
              icon: Vibrate,
              title: t.vibrationTitle,
              on: vibrationEnabled,
              toggle: () => toggleVibration(),
            },
            {
              key: 'theme',
              icon: theme === 'dark' ? Moon : Sun,
              title: t.themeDark,
              on: theme === 'dark',
              toggle: () => {
                triggerHaptic('light');
                setTheme(theme === 'dark' ? 'light' : 'dark');
              },
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                role="switch"
                aria-checked={item.on}
                onClick={item.toggle}
                className={row}
              >
                <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-900 dark:text-slate-50">{item.title}</span>
                <span
                  className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                    item.on ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(12,10,9,0.2)] transition-transform duration-200 ease-[var(--ease-out)] ${
                      item.on ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Hujjatlar va admin */}
      <section className={`${card} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
        <button type="button" onClick={() => setShowOfertaModal(true)} className={row}>
          <ScrollText className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 py-3">
            <span className="block text-[15px] font-medium text-slate-900 dark:text-slate-50">{t.offerCardTitle}</span>
            <span className="block text-[13px] text-slate-500 dark:text-slate-400">{t.offerCardDesc}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenAdminLogin?.();
          }}
          className={row}
        >
          <Lock className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 text-[14px] text-slate-500 dark:text-slate-400">{t.adminLoginBtn}</span>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
        </button>
      </section>

      <PublicOfferModal isOpen={showOfertaModal} onClose={() => setShowOfertaModal(false)} />

      <p className="text-center text-[12px] text-slate-400 dark:text-slate-500">{t.officialVersion}</p>
    </div>
  );
};
