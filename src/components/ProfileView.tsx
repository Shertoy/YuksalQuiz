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
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { PublicOfferModal } from './PublicOfferModal';
import { UserAvatar } from './UserAvatar';

interface ProfileViewProps {
  onOpenAdminLogin?: () => void;
  onOpenEditProfile?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenAdminLogin, onOpenEditProfile }) => {
  const { profile, setActiveTab } = useQuizStore();
  const { t } = useTranslation();
  const [showOfertaModal, setShowOfertaModal] = useState(false);

  return (
    <div className="space-y-4 pb-20">
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all active:scale-95 border border-emerald-500/30"
        >
          <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t.editBtn || 'Tahrirlash'}</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm text-center">
        <div className="relative inline-block mx-auto mb-3">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500/30 overflow-hidden shadow-md flex items-center justify-center p-1">
            <UserAvatar avatar={profile.avatar} />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5" />
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
              <Coins className="w-4 h-4 fill-amber-500" />
              <span>{profile.coins}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t.coins}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-orange-500 font-black text-sm">
              <Flame className="w-4 h-4 fill-orange-500" />
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

        {/* 100% Free Learning Mode Status */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                {t.freeModeTitle}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {t.freeModeDesc}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {t.activeStatus}
          </span>
        </div>
      </div>

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
            <Lock className="w-3.5 h-3.5 text-slate-400" />
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
