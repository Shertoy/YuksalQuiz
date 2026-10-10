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
  const { tr } = useTranslation();
  const SOM = tr("so'm", 'сум', 'UZS');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
      <div className="w-full max-w-md max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Crown className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{isSubscribed ? tr('Obunani uzaytirish', 'Продлить подписку', 'Extend subscription') : tr("Obuna bo'lish", 'Оформить подписку', 'Subscribe')}</span>
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Premium
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isSubscribed ? tr('Mavjud obuna muddatini uzaytirish va yangi reja tanlash', 'Продлите подписку и выберите новый тариф', 'Extend your subscription and choose a new plan') : tr('Barcha HEMIS va fan testlariga cheksiz kirish huquqi', 'Безлимитный доступ ко всем тестам HEMIS', 'Unlimited access to all HEMIS tests')}
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
                  <span className="font-semibold truncate block">
                    {isEndingSoon
                      ? tr(`Obunangiz tugashiga ${remainingDays} kun qoldi`, `До конца подписки осталось ${remainingDays} дн.`, `${remainingDays} days left on your subscription`)
                      : `Premium · ${remainingDays !== null ? tr(`${remainingDays} kun qoldi`, `осталось ${remainingDays} дн.`, `${remainingDays} days left`) : tr('faol', 'активна', 'active')}`}
                  </span>
                  <span className="text-[11px] opacity-80 block truncate">
                    {tr("Yangi muddat joriy obunangizga qo'shiladi", 'Новый срок добавится к текущей подписке', 'The new period is added to your current one')}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
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
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {tr('Hisobingiz:', 'Ваш баланс:', 'Your balance:')}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {currentBalance.toLocaleString('uz-UZ')} {SOM}
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
              <span>{tr("To'ldirish", 'Пополнить', 'Top up')}</span>
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
              {tr('Tarifni tanlang:', 'Выберите тариф:', 'Choose a plan:')}
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
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                    {tr('3 oylik', '3 месяца', '3 months')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr("90 kunlik to'liq kirish", 'Полный доступ на 90 дней', 'Full access for 90 days')}
                  </p>
                </div>
                <div className="text-right">
                  {hasVoucher && (
                    <span className="line-through text-[11px] text-slate-400 font-semibold block">
                      {price3M.toLocaleString('uz-UZ')} {SOM}
                    </span>
                  )}
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {cost3Months.toLocaleString('uz-UZ')} {SOM}
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
              <span className="absolute -top-2 right-3 text-[11px] font-bold px-2 py-0.2 rounded-full bg-orange-500 text-white shadow-xs">
                {tr('Tavsiya etiladi', 'Рекомендуем', 'Recommended')}
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                    {tr('6 oylik (180 kun)', '6 месяцев (180 дней)', '6 months (180 days)')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr('Eng ommabop tarif', 'Самый популярный тариф', 'Most popular plan')}
                  </p>
                </div>
                <div className="text-right">
                  {hasVoucher && (
                    <span className="line-through text-[11px] text-slate-400 font-semibold block">
                      {price6M.toLocaleString('uz-UZ')} {SOM}
                    </span>
                  )}
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {cost6Months.toLocaleString('uz-UZ')} {SOM}
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
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                    {tr('1 yillik (365 kun)', '1 год (365 дней)', '1 year (365 days)')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr("Butun o'quv yili uchun cheksiz kirish", 'Безлимитный доступ на весь учебный год', 'Unlimited access for the whole academic year')}
                  </p>
                </div>
                <div className="text-right">
                  {hasVoucher && (
                    <span className="line-through text-[11px] text-slate-400 font-semibold block">
                      {price1Y.toLocaleString('uz-UZ')} {SOM}
                    </span>
                  )}
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {cost1Year.toLocaleString('uz-UZ')} {SOM}
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
                {tr("20 000 so'm boshlang'ich vaucher chegirmasi avtomatik chegirib berildi!", 'Стартовый ваучер на 20 000 сум применён автоматически.', 'Your 20,000 UZS starter voucher was applied automatically.')}
              </span>
            </div>
          )}

          {/* Action Button Section */}
          <div className="space-y-2 pt-2">
            {canAfford ? (
              <button
                type="button"
                onClick={handlePayFromBalance}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5 text-white" strokeWidth={2} />
                <span>
                  {isSubscribed
                    ? `${tr('Obunani uzaytirish', 'Продлить подписку', 'Extend subscription')} (${planCost.toLocaleString('uz-UZ')} ${SOM})`
                    : `${tr("Hisobdan to'lash", 'Оплатить с баланса', 'Pay from balance')} (${planCost.toLocaleString('uz-UZ')} ${SOM})`}
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
                  className="w-full py-3.5 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5 text-white" strokeWidth={2} />
                  <span>{tr("Hisobni to'ldirish", 'Пополнить баланс', 'Top up balance')} (+{deficit.toLocaleString('uz-UZ')} {SOM})</span>
                </button>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">
                  {tr(`Hisobingizda ${currentBalance.toLocaleString('uz-UZ')} so'm bor. Ushbu obunani olish uchun yana ${deficit.toLocaleString('uz-UZ')} so'm to'ldiring.`, `На балансе ${currentBalance.toLocaleString('uz-UZ')} сум. Для этой подписки пополните ещё на ${deficit.toLocaleString('uz-UZ')} сум.`, `Your balance is ${currentBalance.toLocaleString('uz-UZ')} UZS. Top up ${deficit.toLocaleString('uz-UZ')} UZS more for this plan.`)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
