import React, { useState } from 'react';
import { useQuizStore, DEFAULT_SUBSCRIPTION_PRICES } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Crown,
  Wallet,
  Sparkles,
  Check,
  ChevronRight,
  PlusCircle,
  X,
  CreditCard,
  Ticket,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { SubscriptionPlanType } from '../types';
import { isPaidUser, getSubscriptionRemainingDays } from '../services/paywallService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessAndStart?: () => void;
  onOpenDepositModal: (suggestedAmount?: number) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccessAndStart,
  onOpenDepositModal,
}) => {
  const { profile, subscriptionPrices, applySubscription } = useQuizStore();
  const { t } = useTranslation();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('6_months');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const isSubscribed = isPaidUser(profile);
  const remainingDays = getSubscriptionRemainingDays(profile);
  const isEndingSoon = remainingDays !== null && remainingDays <= 10 && remainingDays > 0;

  const currentBalance = profile.walletBalance || 0;
  const currentVoucher = profile.voucherBalance || 0;
  const hasVoucher = currentVoucher > 0;
  const voucherDiscount = 0; // vaucher claim qilinganda balansga qo'shiladi, chegirma emas

  // Dynamic Plan Pricing from store
  const prices = subscriptionPrices || DEFAULT_SUBSCRIPTION_PRICES;
  const price3M = prices['3_months'] || 35000;
  const price6M = prices['6_months'] || 60000;
  const price1Y = prices['1_year'] || 100000;

  const cost3Months = hasVoucher ? Math.max(0, price3M - voucherDiscount) : price3M;
  const cost6Months = hasVoucher ? Math.max(0, price6M - voucherDiscount) : price6M;
  const cost1Year = hasVoucher ? Math.max(0, price1Y - voucherDiscount) : price1Y;

  const getCurrentPlanCost = () => {
    switch (selectedPlan) {
      case '3_months':
        return cost3Months;
      case '6_months':
        return cost6Months;
      case '1_year':
        return cost1Year;
    }
  };

  const planCost = getCurrentPlanCost();
  const canAfford = currentBalance >= planCost;
  const deficit = Math.max(0, planCost - currentBalance);

  const handlePayFromBalance = async () => {
    if (!canAfford) {
      triggerHaptic('warning');
      onOpenDepositModal(deficit);
      return;
    }

    triggerHaptic('medium');
    const res = await applySubscription(selectedPlan);

    if (res.success) {
      triggerHaptic('success');
      soundFX.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setFeedback({ type: 'success', message: res.message });

      setTimeout(() => {
        setFeedback(null);
        if (onSuccessAndStart) {
          onSuccessAndStart();
        } else {
          onClose();
        }
      }, 1200);
    } else {
      triggerHaptic('error');
      soundFX.playError();
      setFeedback({ type: 'error', message: res.message });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Crown className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{isSubscribed ? "Obunani Uzaytirish / Tariflar" : "Obuna Bo'lish / Tariflar"}</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Premium
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isSubscribed ? "Mavjud obuna muddatini uzaytirish va yangi reja tanlash" : "Barcha HEMIS va fan testlariga cheksiz kirish huquqi"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto overscroll-contain p-5 pb-8 space-y-4 flex-1">
          {/* Active Subscription Status Banner */}
          {isSubscribed && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2.5 ${
                isEndingSoon
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="w-4 h-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <span className="font-extrabold truncate block">
                    {isEndingSoon
                      ? `⚠️ Obunangiz tugashiga ${remainingDays} kun qoldi!`
                      : `Faol Premium (${remainingDays !== null ? `${remainingDays} kun qoldi` : 'Faol'})`}
                  </span>
                  <span className="text-[10px] opacity-80 block truncate">
                    Yangi tanlangan muddat joriy sanangizga qo'shiladi (+uzaytirish)
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                VIP
              </span>
            </div>
          )}

          {/* User Balance Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Hisobingiz:
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {currentBalance.toLocaleString('uz-UZ')} so'm
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenDepositModal(deficit > 0 ? deficit : 20000);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-xs shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>+ To'ldirish</span>
            </button>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-orange-500 text-white'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Plan Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Tarifni Tanlang:
            </label>

            {/* 1. 3 Months */}
            <div
              onClick={() => {
                triggerHaptic('selection');
                setSelectedPlan('3_months');
              }}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedPlan === '3_months'
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    3 Oylik Reja
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    90 kunlik to'liq kirish
                  </p>
                </div>
                <div className="text-right">
                  {hasVoucher && (
                    <span className="line-through text-[10px] text-slate-400 font-semibold block">
                      {price3M.toLocaleString('uz-UZ')} so'm
                    </span>
                  )}
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {cost3Months.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 6 Months (Recommended) */}
            <div
              onClick={() => {
                triggerHaptic('selection');
                setSelectedPlan('6_months');
              }}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                selectedPlan === '6_months'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
              }`}
            >
              <span className="absolute -top-2 right-3 text-[9px] font-black px-2 py-0.2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white uppercase shadow-xs">
                Tavsiya etiladi
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    6 Oylik Reja (180 kun)
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Eng ommabop va qulay tarif
                  </p>
                </div>
                <div className="text-right">
                  {hasVoucher && (
                    <span className="line-through text-[10px] text-slate-400 font-semibold block">
                      {price6M.toLocaleString('uz-UZ')} so'm
                    </span>
                  )}
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    {cost6Months.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              </div>
            </div>

            {/* 3. 1 Year */}
            <div
              onClick={() => {
                triggerHaptic('selection');
                setSelectedPlan('1_year');
              }}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedPlan === '1_year'
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    1 Yillik Reja (365 kun)
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Butun o'quv yili uchun cheksiz kirish
                  </p>
                </div>
                <div className="text-right">
                  {hasVoucher && (
                    <span className="line-through text-[10px] text-slate-400 font-semibold block">
                      {price1Y.toLocaleString('uz-UZ')} so'm
                    </span>
                  )}
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {cost1Year.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Voucher Notice */}
          {hasVoucher && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-200">
              <Ticket className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                20 000 so'm boshlang'ich vaucher chegirmasi avtomatik chegirib berildi!
              </span>
            </div>
          )}

          {/* Action Button Section */}
          <div className="space-y-2 pt-2">
            {canAfford ? (
              <button
                type="button"
                onClick={handlePayFromBalance}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5 text-white" strokeWidth={2} />
                <span>
                  {isSubscribed
                    ? `Obunani uzaytirish (${planCost.toLocaleString('uz-UZ')} so'm)`
                    : `Hisobdan to'lash (${planCost.toLocaleString('uz-UZ')} so'm)`}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenDepositModal(deficit);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5 text-white" strokeWidth={2} />
                  <span>Hisobni to'ldirish (+{deficit.toLocaleString('uz-UZ')} so'm kerak)</span>
                </button>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">
                  Hisobingizda {currentBalance.toLocaleString('uz-UZ')} so'm bor. Ushbu obunani olish uchun yana {deficit.toLocaleString('uz-UZ')} so'm to'ldiring.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
