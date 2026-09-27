import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Wallet,
  Ticket,
  Crown,
  History,
  Coins,
  Share2,
  Award,
  CreditCard,
  ShieldAlert,
  X,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { ReferralShareCard } from './ReferralShareCard';
import { TransactionType } from '../types';

export const WalletView: React.FC = () => {
  const { profile, applySubscription, topUpWallet, transactions } = useQuizStore();
  const { t } = useTranslation();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | TransactionType>('all');

  // Top Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedTopUpAmount, setSelectedTopUpAmount] = useState<number>(15000);
  const [customTopUpStr, setCustomTopUpStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Payme' | 'Click' | 'Uzum Bank'>('Payme');

  const currentBalance = profile.walletBalance || 0;
  const currentVoucher = profile.voucherBalance || 0;
  const hasVoucher = currentVoucher >= 35000 && profile.subscriptionPlan === 'none';

  // Plan pricing
  const cost6Months = hasVoucher ? 15000 : 50000;
  const cost1Year = 90000;

  // Affordability
  const canAfford6M = currentBalance >= cost6Months;
  const deficit6M = Math.max(0, cost6Months - currentBalance);

  const canAfford1Y = currentBalance >= cost1Year;
  const deficit1Y = Math.max(0, cost1Year - currentBalance);

  const handleOpenTopUp = (presetAmount?: number) => {
    triggerHaptic('light');
    if (presetAmount && presetAmount > 0) {
      setSelectedTopUpAmount(presetAmount);
      setCustomTopUpStr(presetAmount.toString());
    } else {
      setSelectedTopUpAmount(15000);
      setCustomTopUpStr('');
    }
    setShowTopUpModal(true);
  };

  const handleConfirmTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customTopUpStr ? parseInt(customTopUpStr, 10) || 0 : selectedTopUpAmount;

    if (finalAmount <= 0) {
      triggerHaptic('error');
      return;
    }

    topUpWallet(finalAmount, paymentMethod);
    setShowTopUpModal(false);

    setFeedback({
      type: 'success',
      message: `Hisobingizga +${finalAmount.toLocaleString('uz-UZ')} so'm muvaffaqiyatli qo'shildi! (${paymentMethod})`,
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSubscribe = (plan: '6_months' | '1_year') => {
    const res = applySubscription(plan);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="space-y-4 pb-4 animate-in fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <span>{t.walletTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.walletSubtitle}
          </p>
        </div>

        {/* History Trigger Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setShowHistoryModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <History className="w-3.5 h-3.5 text-indigo-500" />
          <span>Tarix</span>
        </button>
      </div>

      {/* Mandatory Guardrail Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs font-semibold leading-relaxed">
          <span className="font-extrabold block mb-0.5">{t.guardrailNoticeTitle}</span>
          {t.guardrailNoticeText}
        </p>
      </div>

      {/* Dynamic Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">
            {feedback.message}
            {feedback.type === 'error' && (
              <button
                type="button"
                onClick={() => handleOpenTopUp()}
                className="mt-2 block px-3 py-1 bg-white text-rose-600 rounded-lg font-black text-[11px] shadow-sm hover:bg-rose-50 transition-colors"
              >
                + Balansni to'ldirish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unified Hamyon Balansi Card with Direct Top-Up Action */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white rounded-3xl p-5 shadow-xl shadow-indigo-600/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between text-indigo-200 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">{t.internalBalance}</span>
            <Wallet className="w-5 h-5 text-indigo-300" />
          </div>

          <div className="flex items-center justify-between gap-3 mt-1">
            <div className="text-2xl font-black tracking-tight text-white">
              {currentBalance.toLocaleString('uz-UZ')} so'm
            </div>

            {/* Quick Top-Up Button */}
            <button
              type="button"
              onClick={() => handleOpenTopUp()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all active:scale-95 shadow-sm border border-white/20"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-300" />
              <span>{t.topUpBtn}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/15 text-[11px] text-indigo-200">
            <span>Mualliflik daromadi: +{profile.authorEarnings.toLocaleString('uz-UZ')} so'm</span>
            <span>Referal: +{(profile.referralCount * 1500).toLocaleString('uz-UZ')} so'm</span>
          </div>
        </div>
      </div>

      {/* Active Voucher Banner - ONLY visible if voucher is active and not used */}
      {hasVoucher && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/25 shrink-0">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  35 000 so'm vaucheringiz faol!
                </h4>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white uppercase">
                  Faol
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                6 oylik Premium obunani atigi 15 000 so'mga olish imkoniyati
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Subscription status if any */}
      {profile.subscriptionPlan && profile.subscriptionPlan !== 'none' && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
            <div>
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-100">
                Premium Obuna Faol ({profile.subscriptionPlan === '6_months' ? '6 oylik' : '1 yillik'})
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Muddati: {profile.subscriptionExpiry || '2027'} yilgacha
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
            Faol
          </span>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Obuna Rejalari
          </h3>
          {hasVoucher && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              6 oylik rejaga -35 000 so'm avto-chegirma
            </span>
          )}
        </div>

        {/* 6-Month Plan */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-4 shadow-sm relative overflow-hidden hover:border-indigo-500 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  Talabalar tanlovi
                </span>
                {profile.subscriptionPlan === '6_months' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                    Joriy rejangiz
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                {t.sub6Months}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.sub6MonthsDesc}
              </p>
            </div>

            <div className="text-right">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  50 000 so'm
                </span>
              )}
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {hasVoucher ? '15 000 so\'m' : '50 000 so\'m'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {hasVoucher ? `✓ ${t.voucherApplied}` : "HEMIS & sertifikat testlari"}
            </span>

            {canAfford6M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('6_months')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>
                  {profile.subscriptionPlan === '6_months'
                    ? 'Muddati uzaytirish'
                    : t.activateSub}
                </span>
                <span className="text-[10px] opacity-80">({cost6Months.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenTopUp(deficit6M)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>To'ldirish (+{deficit6M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}
          </div>

          {!canAfford6M && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-semibold">
              Balansingizda {currentBalance.toLocaleString('uz-UZ')} so'm mavjud. Obuna uchun yana {deficit6M.toLocaleString('uz-UZ')} so'm kerak.
            </p>
          )}
        </div>

        {/* 1-Year Plan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm relative overflow-hidden hover:border-indigo-400 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  To'liq 1 yil
                </span>
                {profile.subscriptionPlan === '1_year' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                    Joriy rejangiz
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                {t.sub1Year}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.sub1YearDesc}
              </p>
            </div>

            <div className="text-right">
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                90 000 so'm
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium text-[10px]">
              Yillik cheksiz kirish kafolati
            </span>

            {canAfford1Y ? (
              <button
                type="button"
                onClick={() => handleSubscribe('1_year')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>
                  {profile.subscriptionPlan === '1_year'
                    ? 'Muddati uzaytirish'
                    : t.activateSub}
                </span>
                <span className="text-[10px] opacity-80">(90 000 so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenTopUp(deficit1Y)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>To'ldirish (+{deficit1Y.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}
          </div>

          {!canAfford1Y && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-semibold">
              Balansingizda {currentBalance.toLocaleString('uz-UZ')} so'm mavjud. Obuna uchun yana {deficit1Y.toLocaleString('uz-UZ')} so'm kerak.
            </p>
          )}
        </div>
      </div>

      {/* Referral Section with Direct Telegram Share */}
      <ReferralShareCard />

      {/* Dedicated Transaction History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Tranzaksiyalar Tarixi
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Barcha to'lovlar, vaucherlar va mukofotlar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-3 overflow-x-auto border-b border-slate-100 dark:border-slate-800 text-[11px] scrollbar-none">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'deposit', label: "To'lovlar" },
                { id: 'voucher', label: 'Vaucherlar' },
                { id: 'referral', label: 'Referal' },
                { id: 'coin', label: 'Tangalar' },
                { id: 'author_reward', label: 'Mualliflik' },
              ].map((tab) => {
                const isActive = txFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setTxFilter(tab.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(!transactions || transactions.length === 0) ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="font-bold">Tranzaksiyalar mavjud emas</p>
                </div>
              ) : (
                (() => {
                  const filtered = transactions.filter((tx) => {
                    if (txFilter === 'all') return true;
                    return tx.type === txFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs font-medium">
                        Tanlangan toifada tranzaksiyalar topilmadi
                      </div>
                    );
                  }

                  return filtered.map((tx) => {
                    const getTxIcon = () => {
                      switch (tx.type) {
                        case 'voucher':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                              <Ticket className="w-4 h-4" />
                            </div>
                          );
                        case 'referral':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                              <Share2 className="w-4 h-4" />
                            </div>
                          );
                        case 'coin':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <Coins className="w-4 h-4" />
                            </div>
                          );
                        case 'author_reward':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Award className="w-4 h-4" />
                            </div>
                          );
                        case 'deposit':
                        default:
                          return (
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <CreditCard className="w-4 h-4" />
                            </div>
                          );
                      }
                    };

                    return (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getTxIcon()}
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {tx.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {tx.date}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${
                              tx.isPositive
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {tx.isPositive ? '+' : '-'}
                            {tx.amount.toLocaleString('uz-UZ')} {tx.unit}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Top-Up Modal (Click / Payme / Uzum) */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {t.topUpModalTitle}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {t.topUpModalDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTopUp} className="p-4 space-y-4">
              {/* Current balance indicator */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {t.internalBalance}:
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {currentBalance.toLocaleString('uz-UZ')} so'm
                </span>
              </div>

              {/* Amount Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {t.selectAmount}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "15 000 so'm", val: 15000, desc: 'Vaucherli 6 oy' },
                    { label: "50 000 so'm", val: 50000, desc: '6 oylik to\'liq' },
                    { label: "90 000 so'm", val: 90000, desc: '1 yillik reja' },
                  ].map((preset) => {
                    const isSelected = !customTopUpStr && selectedTopUpAmount === preset.val;
                    return (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedTopUpAmount(preset.val);
                          setCustomTopUpStr('');
                        }}
                        className={`p-2 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black block">{preset.label}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="mt-2">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={customTopUpStr}
                    onChange={(e) => setCustomTopUpStr(e.target.value)}
                    placeholder={t.customAmountPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  {t.paymentMethod}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Payme', badge: 'Payme' },
                    { id: 'Click', badge: 'Click Up' },
                    { id: 'Uzum Bank', badge: 'Uzum' },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setPaymentMethod(m.id as any);
                        }}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 font-black'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 font-bold'
                        }`}
                      >
                        <span className="text-xs">{m.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Top-up */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {t.payBtn} (+{((customTopUpStr ? parseInt(customTopUpStr, 10) || 0 : selectedTopUpAmount)).toLocaleString('uz-UZ')} so'm)
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
