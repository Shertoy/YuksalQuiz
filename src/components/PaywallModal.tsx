import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  CreditCard,
  Lock,
  Zap,
  CheckCircle2,
  X,
  Wallet,
  Sparkles,
  ArrowLeft,
  Crown,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: () => void;
  onOpenSubscription?: () => void;
  testTitle?: string;
  blockTitle?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onTopUp,
  onOpenSubscription,
  testTitle,
  blockTitle,
}) => {
  const { profile } = useQuizStore();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const currentBalance = profile.walletBalance || 0;

  const handleTopUpClick = () => {
    triggerHaptic('medium');
    onTopUp();
  };

  const handleBackClick = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 flex flex-col text-slate-900 dark:text-white">
        
        {/* Glowing Orange and Emerald Accent Blur Orbs */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Close Button */}
        <div className="relative z-10 flex justify-end p-4 pb-0 shrink-0">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Modal Scrollable Content Wrapper */}
        <div className="overflow-y-auto overscroll-contain p-5 pb-8 space-y-4 flex-1 relative z-10">

        {/* Vibrant Lock & Sparkle Center Badge */}
        <div className="relative z-10 text-center -mt-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 p-0.5 shadow-xl shadow-orange-500/25 mx-auto ring-4 ring-orange-500/15 flex items-center justify-center animate-bounce">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[22px] flex items-center justify-center">
              <Lock className="w-7 h-7 text-orange-500 dark:text-orange-400" strokeWidth={2} />
            </div>
          </div>

          {/* Sarlavha */}
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
            Kunlik bepul limit tugadi
          </h3>

          {/* Test Name (Optional Context) */}
          {(testTitle || blockTitle) && (
            <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 mt-1 truncate px-2">
              {[testTitle, blockTitle].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Matn */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5 max-w-sm mx-auto">
            Siz ushbu testni bugun 2 marta bepul topshirdingiz. Kunlik cheklovlarsiz barcha testlardan foydalanish uchun balansingizni to'ldiring.
          </p>
        </div>

        {/* Limit Stats Card (Green & Orange Accent) */}
        <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-emerald-500/10 border border-orange-500/20 dark:border-orange-500/30">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              Bugungi urinishlar:
            </span>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 font-black text-[11px] border border-orange-200 dark:border-orange-800">
              2 / 2 (Tugagan)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full" />
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
            Har bir test uchun bepul limit ertaga soat 00:00 da avtomatik yangilanadi.
          </p>
        </div>

        {/* Premium Value Props */}
        <div className="relative z-10 mt-3.5 space-y-2">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>Barcha testlarni cheklovlarsiz yechish</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <span>OTM va Respublika reytingida ishtirok etish</span>
          </div>
        </div>

        {/* Current Balance Bar */}
        <div className="relative z-10 mt-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            Hamyon balansingiz:
          </span>
          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {currentBalance.toLocaleString('uz-UZ')} so'm
          </span>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 mt-5 space-y-2.5">
          {/* Asosiy tugma: "Hisobni to'ldirish" */}
          <button
            type="button"
            onClick={handleTopUpClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/25 ring-2 ring-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <CreditCard className="w-5 h-5 text-white" strokeWidth={2} />
            <span>Hisobni to'ldirish</span>
          </button>

          {/* Agar hisobida mablag' bo'lsa, to'g'ridan-to'g'ri tarif faollashtirish imkoni */}
          {currentBalance >= 35000 && onOpenSubscription && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onOpenSubscription();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Balansdan tarif sotib olish</span>
            </button>
          )}

          {/* Ikkilamchi tugma: "Orqaga qaytish" */}
          <button
            type="button"
            onClick={handleBackClick}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Orqaga qaytish</span>
          </button>
        </div>

        </div>
      </div>
    </div>
  );
};
