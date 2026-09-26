import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Wallet,
  Ticket,
  Crown,
  ScrollText,
  ShieldAlert,
  History,
  Coins,
  Share2,
  Award,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { PublicOfferModal } from './PublicOfferModal';
import { ReferralShareCard } from './ReferralShareCard';
import { TransactionType } from '../types';

export const WalletView: React.FC = () => {
  const { profile, applySubscription, transactions } = useQuizStore();
  const { t } = useTranslation();
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'all' | TransactionType>('all');

  const handleSubscribe = (plan: '6_months' | '1_year') => {
    triggerHaptic('success');
    soundFX.playCoin();
    const res = applySubscription(plan);
    setFeedbackMessage(res.message);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const hasVoucher = profile.voucherBalance >= 35000;

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

        <button
          onClick={() => {
            triggerHaptic('light');
            setShowOfertaModal(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>{t.ofertaLink}</span>
        </button>
      </div>

      {/* Mandatory Guardrail Badge */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs font-semibold leading-relaxed">
          <span className="font-extrabold block mb-0.5">{t.guardrailNoticeTitle}</span>
          {t.guardrailNoticeText}
        </p>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 text-center">
          {feedbackMessage}
        </div>
      )}

      {/* Balances Grid: Voucher vs Internal */}
      <div className="grid grid-cols-2 gap-3">
        {/* Voucher Balance Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-3xl p-4 shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between text-indigo-100">
            <span className="text-xs font-bold">{t.voucherBalance}</span>
            <Ticket className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-lg font-black tracking-tight mt-1">
            {profile.voucherBalance.toLocaleString('uz-UZ')} so'm
          </div>
          <p className="text-[10px] text-indigo-200 mt-1">
            Obuna uchun 35 000 so'm tejaladi
          </p>
        </div>

        {/* Internal Cash / Referral Wallet Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
            {t.internalBalance}
          </span>
          <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            {profile.walletBalance.toLocaleString('uz-UZ')} so'm
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {t.authorEarnings}: +{profile.authorEarnings.toLocaleString('uz-UZ')} so'm
          </p>
        </div>
      </div>

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

      {/* Subscription Plans with Strict Voucher Logic */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Obuna Rejalari
          </h3>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            6 oylik rejaga -35 000 so'm avto-chegirma
          </span>
        </div>

        {/* 6-Month Plan: 50 000 - 35 000 voucher = 15 000 UZS */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-4 shadow-sm relative overflow-hidden hover:border-indigo-500 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                Talabalar tanlovi
              </span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                {t.sub6Months}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.sub6MonthsDesc}
              </p>
            </div>

            <div className="text-right">
              <span className="line-through text-xs text-slate-400 font-semibold block">
                50 000 so'm
              </span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {hasVoucher ? '15 000 so\'m' : '50 000 so\'m'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ {t.voucherApplied}
            </span>
            <button
              onClick={() => handleSubscribe('6_months')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {t.activateSub} (15 000 so'm)
            </button>
          </div>
        </div>

        {/* 1-Year Plan: 90 000 UZS (No voucher stacking) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm relative overflow-hidden hover:border-indigo-400 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                To'liq 1 yil
              </span>
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
            <button
              onClick={() => handleSubscribe('1_year')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              {t.activateSub} (90 000 so'm)
            </button>
          </div>
        </div>
      </div>

      {/* Referral Section with Direct Telegram Share */}
      <ReferralShareCard />

      {/* Transaction History Section with Category Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Tranzaksiyalar Tarixi
              </h3>
              <p className="text-[10px] text-slate-400">
                To'lovlar, vaucherlar, referal va mukofotlar
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {transactions?.length || 0} ta
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
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
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Transactions List */}
        <div className="space-y-2">
          {(!transactions || transactions.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="font-bold">Hozircha tranzaksiyalar mavjud emas</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bonuslar, to'lovlar va vaucherlar harakati shu yerda aks etadi.
              </p>
            </div>
          ) : (
            (() => {
              const filtered = transactions.filter((tx) => {
                if (txFilter === 'all') return true;
                return tx.type === txFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Tanlangan toifada tranzaksiyalar topilmadi
                  </div>
                );
              }

              return filtered.map((tx) => {
                const getTxIcon = () => {
                  switch (tx.type) {
                    case 'voucher':
                      return (
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Ticket className="w-4 h-4" />
                        </div>
                      );
                    case 'referral':
                      return (
                        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Share2 className="w-4 h-4" />
                        </div>
                      );
                    case 'coin':
                      return (
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Coins className="w-4 h-4" />
                        </div>
                      );
                    case 'author_reward':
                      return (
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                      );
                    case 'deposit':
                    default:
                      return (
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                      );
                  }
                };

                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-indigo-200 dark:hover:border-slate-700 transition-colors"
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
      </div>

      {/* Public Offer Legal Modal */}
      <PublicOfferModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
      />
    </div>
  );
};
