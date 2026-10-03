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
  const { t } = useTranslation();
  const [showOfertaModal, setShowOfertaModal] = useState(false);

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {t.profileTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.profileSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenEditProfile?.();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all active:scale-95 border border-emerald-500/30 shadow-xs"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
          <span>{t.editProfileBtn || 'Profilni tahrirlash'}</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm text-center">
        <div
          onClick={() => {
            triggerHaptic('light');
            onOpenEditProfile?.();
          }}
          className="relative inline-block mx-auto mb-3 cursor-pointer group"
          title={t.editProfileBtn || 'Profilni tahrirlash'}
        >
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500/30 group-hover:border-emerald-500 overflow-hidden shadow-md flex items-center justify-center p-1 transition-all">
            <UserAvatar avatar={profile.avatar} />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow ring-2 ring-white dark:ring-slate-900 group-hover:scale-110 transition-transform">
            <Edit3 className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </span>
        </div>

        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
          {profile.firstName || 'Talaba'} {profile.lastName || ''}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {profile.university ? `${profile.university} • ` : ''}{profile.region} • {profile.academicYear}{t.courseUnit} • {profile.studyType}
        </p>

        {/* Security Signature Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t.securityVerified}</span>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm">
              <Coins className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span>{profile.coins}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t.coins}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-orange-500 font-black text-sm">
              <Flame className="w-4 h-4 text-orange-500" strokeWidth={1.75} />
              <span>{profile.streak} {t.daysUnit || 'kun'}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t.streak}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
              <BookOpen className="w-4 h-4" />
              <span>{profile.completedTestsCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t.testsCompleted}</p>
          </div>
        </div>

        {/* Wallet Balance & Deposit Action Highlight */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-left flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                Hisobingiz:
              </div>
              <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                {(profile.walletBalance || 0).toLocaleString('uz-UZ')} so'm
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenReceiptModal?.();
              }}
              className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
            >
              <PlusCircle className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>+ To'ldirish</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('wallet');
              }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Hamyon tarixi"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Direct Edit Profile Action Button */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onOpenEditProfile?.();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Edit3 className="w-5 h-5 text-white" strokeWidth={2} />
            <span>{t.editProfileBtn || 'Profilni tahrirlash'}</span>
          </button>
        </div>
      </div>

      {/* Referral Share System */}
      <ReferralShareCard userId={profile.id} />

      {/* My Results & Mistakes Analytics Card */}
      <div
        onClick={() => {
          triggerHaptic('light');
          setActiveTab('results');
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
              {t.myResultsCardTitle}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.myResultsCardDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span>{t.viewBtn}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Settings (Ovoz va Vibratsiya) Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-1 px-1">
          <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {t.settingsTitle}
          </h4>
        </div>

        {/* Sound FX Toggle Row */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500'
            }`}>
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <VolumeX className="w-4 h-4" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                {t.soundEffectsTitle}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {t.soundEffectsDesc}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={() => {
              toggleSound();
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Vibration / Haptic Toggle Row */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              vibrationEnabled
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500'
            }`}>
              <Vibrate className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                {t.vibrationTitle}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {t.vibrationDesc}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={vibrationEnabled}
            onClick={() => {
              toggleVibration();
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              vibrationEnabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Dark/Light Theme Toggle Row */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              theme === 'dark'
                ? 'bg-amber-500/15 text-amber-500'
                : 'bg-emerald-500/15 text-emerald-600'
            }`}>
              {theme === 'dark' ? (
                <Moon className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <Sun className="w-4 h-4" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                {theme === 'dark' ? "Tungi rejim (Qorong'i)" : "Kunduzgi rejim (Yorug')"}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Ilova tashqi ko'rinish mavzusi
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={() => {
              triggerHaptic('light');
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Public Offer Link Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <ScrollText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900 dark:text-white">
              {t.offerCardTitle}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.offerCardDesc}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowOfertaModal(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
        >
          {t.readBtn}
        </button>
      </div>

      <PublicOfferModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
      />

      {/* Admin Portal Entry */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenAdminLogin?.();
          }}
          className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-between transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
            <span>{t.adminLoginBtn}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{t.adminControlPanel}</span>
        </button>
      </div>

      {/* App Version Stamp */}
      <div className="pt-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{t.officialVersion}</span>
        </div>
      </div>
    </div>
  );
};
