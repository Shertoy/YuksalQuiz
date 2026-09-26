import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  Wallet,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Crown,
  ScrollText,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { PublicOfferModal } from './PublicOfferModal';
import { ReferralShareCard } from './ReferralShareCard';

export const WalletView: React.FC = () => {
  const { profile, applySubscription } = useQuizStore();
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleSubscribe = (plan: '6_months' | '1_year') => {
    triggerHaptic('success');
    soundFX.playCoin();
    const res = applySubscription(plan);
    setFeedbackMessage(res.message);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const hasVoucher = profile.voucherBalance >= 35000;
  const voucherDiscount = hasVoucher ? 35000 : profile.voucherBalance;

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <span>Talaba Hamyoni</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ichki balans, vaucherlar va ta'limiy obunalar
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
          <span>Oferta</span>
        </button>
      </div>

      {/* Mandatory Guardrail Badge */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs font-semibold leading-relaxed">
          <span className="font-extrabold block mb-0.5">Eslatma:</span>
          Hisobdagi vaucher va bonuslar faqat ilova ichidagi obunalarni faollashtirish uchun ishlatiladi. Kartaga yechib olish imkonsiz.
        </p>
      </div>

      {feedbackMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold text-center shadow-lg animate-in fade-in">
          {feedbackMessage}
        </div>
      )}

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Voucher Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 rounded-3xl shadow-lg shadow-indigo-600/20 relative overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-2">
            <Ticket className="w-4 h-4 text-emerald-300" />
          </div>
          <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
            Vaucher Balansi
          </span>
          <div className="text-lg font-black tracking-tight mt-0.5">
            {profile.voucherBalance.toLocaleString('uz-UZ')} so'm
          </div>
          <p className="text-[10px] text-emerald-300 mt-1 font-semibold">
            Obuna uchun avto-chegirma
          </p>
        </div>

        {/* Internal Cash & Author Credits Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Ichki Balans
          </span>
          <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            {profile.walletBalance.toLocaleString('uz-UZ')} so'm
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Mualliflik: +{profile.authorEarnings.toLocaleString('uz-UZ')} so'm
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

      {/* Subscription Plans with Auto-applied 35 000 UZS Voucher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Obuna Rejalari (Vaucher Chegirmasi Bilan)
          </h3>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            -35 000 so'm avto-qo'llaniladi
          </span>
        </div>

        {/* 6-Month Plan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm relative overflow-hidden hover:border-indigo-400 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                Talabalar tanlovi
              </span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                6 oylik Premium Obuna
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Barcha OTM, HEMIS va xalqaro testlarga cheksiz kirish
              </p>
            </div>

            <div className="text-right">
              <span className="line-through text-xs text-slate-400 font-semibold block">
                50 000 so'm
              </span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {Math.max(0, 50000 - voucherDiscount).toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ 35 000 so'm vaucher tejaldi
            </span>
            <button
              onClick={() => handleSubscribe('6_months')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Faollashtirish (15 000 so'm)
            </button>
          </div>
        </div>

        {/* 1-Year Plan */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-4 shadow-sm relative overflow-hidden hover:border-indigo-500 transition-all">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-bl-xl tracking-wider">
            Eng Foydali
          </div>

          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                To'liq 1 yil
              </span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                1 yillik Premium Obuna
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Barcha yangi OTM va sertifikat testlariga bir yil kafolat
              </p>
            </div>

            <div className="text-right">
              <span className="line-through text-xs text-slate-400 font-semibold block">
                90 000 so'm
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {Math.max(0, 90000 - voucherDiscount).toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ 35 000 so'm vaucher tejaldi
            </span>
            <button
              onClick={() => handleSubscribe('1_year')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Faollashtirish (55 000 so'm)
            </button>
          </div>
        </div>
      </div>

      {/* Referral Section with Direct Telegram Share */}
      <ReferralShareCard />

      {/* Public Offer Legal Modal */}
      <PublicOfferModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
      />
    </div>
  );
};
