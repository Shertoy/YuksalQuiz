import React, { useState, useRef } from 'react';
import { useQuizStore, DEFAULT_SUBSCRIPTION_PRICES, DEFAULT_PAYMENT_METHODS } from '../store/useQuizStore';
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
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  KeyRound,
  Copy,
  Send,
  HelpCircle,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { ReferralShareCard } from './ReferralShareCard';
import { ReceiptVerifyModal } from './ReceiptVerifyModal';
import { TransactionType, SubscriptionPlanType } from '../types';

export const WalletView: React.FC = () => {
  const {
    profile,
    applySubscription,
    transactions,
    subscriptionPrices,
    paymentMethods,
    activatePromocode,
  } = useQuizStore();
  const { t } = useTranslation();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | TransactionType>('all');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptPlan, setReceiptPlan] = useState<SubscriptionPlanType>('6_months');

  // Promocode state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const promoInputRef = useRef<HTMLInputElement>(null);

  // Active Payment Method State
  const availablePaymentMethods = (paymentMethods && paymentMethods.length > 0)
    ? paymentMethods.filter((pm) => pm.isActive)
    : DEFAULT_PAYMENT_METHODS.filter((pm) => pm.isActive);

  const [selectedPmId, setSelectedPmId] = useState<string>(
    availablePaymentMethods[0]?.id || 'pm-1'
  );

  const currentPaymentMethod =
    availablePaymentMethods.find((pm) => pm.id === selectedPmId) ||
    availablePaymentMethods[0] ||
    DEFAULT_PAYMENT_METHODS[0];

  // Instructional Modal State (NO fake payment buttons!)
  const [instructionModal, setInstructionModal] = useState<{
    isOpen: boolean;
    plan: SubscriptionPlanType;
    planTitle: string;
    amount: number;
  } | null>(null);

  const currentBalance = profile.walletBalance || 0;
  const currentVoucher = profile.voucherBalance || 0;
  // Starting voucher (20 000 UZS) is applicable to ANY subscription plan
  const hasVoucher = currentVoucher > 0;
  const voucherDiscount = Math.min(currentVoucher, 20000);

  // Dynamic Plan Pricing from store
  const prices = subscriptionPrices || DEFAULT_SUBSCRIPTION_PRICES;
  const price3M = prices['3_months'] || 35000;
  const price6M = prices['6_months'] || 50000;
  const price1Y = prices['1_year'] || 90000;

  // Actual cost to pay from wallet balance after applying voucher discount
  const cost3Months = hasVoucher ? Math.max(0, price3M - voucherDiscount) : price3M;
  const cost6Months = hasVoucher ? Math.max(0, price6M - voucherDiscount) : price6M;
  const cost1Year = hasVoucher ? Math.max(0, price1Y - voucherDiscount) : price1Y;

  // Affordability
  const canAfford3M = currentBalance >= cost3Months;
  const deficit3M = Math.max(0, cost3Months - currentBalance);

  const canAfford6M = currentBalance >= cost6Months;
  const deficit6M = Math.max(0, cost6Months - currentBalance);

  const canAfford1Y = currentBalance >= cost1Year;
  const deficit1Y = Math.max(0, cost1Year - currentBalance);

  const handleOpenInstruction = (plan: SubscriptionPlanType, deficit: number) => {
    triggerHaptic('light');
    const planTitle =
      plan === '3_months' ? '3 Oylik Premium' : plan === '6_months' ? '6 Oylik Premium' : '1 Yillik Premium';
    setInstructionModal({
      isOpen: true,
      plan,
      planTitle,
      amount: deficit,
    });
  };

  const handleCloseInstruction = () => {
    triggerHaptic('light');
    setInstructionModal(null);
  };

  const handleGoToPromocode = () => {
    setInstructionModal(null);
    setTimeout(() => {
      promoInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      promoInputRef.current?.focus();
    }, 150);
  };

  const handleSubscribe = (plan: SubscriptionPlanType) => {
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
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleActivatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;

    setPromoLoading(true);
    const res = activatePromocode(clean);
    setPromoLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message,
      });
      setPromoInput('');
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleCopyCardNumber = (customText?: string) => {
    triggerHaptic('light');
    const textToCopy = customText || currentPaymentMethod?.details || '9860 0803 8232 0093';
    const match = textToCopy.match(/\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
    const cleanNumber = match ? match[0] : textToCopy;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanNumber);
    }
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Mobile-Adapted Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={1.75} />
            <span>{t.walletTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.walletSubtitle}
          </p>
        </div>

        {/* History Trigger Button with Mobile Min Height */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setShowHistoryModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95 transition-all shrink-0"
        >
          <History className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
          <span>Tarix</span>
        </button>
      </div>

      {/* Dynamic Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-orange-500 text-white'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
          )}
          <div className="flex-1 leading-relaxed">
            {feedback.message}
          </div>
        </div>
      )}

      {/* Combined Balance & Voucher Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/80 border border-emerald-500/25 text-white rounded-3xl p-5 shadow-xl shadow-emerald-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
        <div className="relative z-10 space-y-3.5">
          {/* Main Balance Row */}
          <div>
            <div className="flex items-center justify-between text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span>{t.internalBalance}</span>
              <Wallet className="w-4 h-4 text-emerald-300" strokeWidth={1.75} />
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {currentBalance.toLocaleString('uz-UZ')} so'm
            </div>
          </div>

          {/* Starting Voucher Badge */}
          {hasVoucher ? (
            <div className="p-3 rounded-2xl bg-white/12 backdrop-blur-md border border-white/20 flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-black shadow-sm">
                <Ticket className="w-4 h-4 text-slate-950" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-white">
                    {currentVoucher.toLocaleString('uz-UZ')} so'm Boshlang'ich Vaucher
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 uppercase">
                    Faol
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100 mt-0.5 leading-snug">
                  Istalgan obuna tarifi (3 oy, 6 oy yoki 1 yil) uchun chegirma sifatida qo'llanadi!
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-emerald-200">
              Boshlang'ich vaucher to'liq ishlatilgan.
            </div>
          )}

          {/* Extra Info Divider */}
          <div className="flex items-center justify-between pt-2.5 border-t border-white/15 text-[11px] text-emerald-200">
            <span>Mualliflik daromadi: +{profile.authorEarnings.toLocaleString('uz-UZ')} so'm</span>
            <span>Referal: +{(profile.referralCount * 1500).toLocaleString('uz-UZ')} so'm</span>
          </div>
        </div>
      </div>

      {/* Active Subscription Status Banner (if active) */}
      {profile.subscriptionPlan && profile.subscriptionPlan !== 'none' && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={1.75} />
            <div>
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-100">
                Premium Obuna Faol ({profile.subscriptionPlan === '3_months' ? '3 oylik' : profile.subscriptionPlan === '6_months' ? '6 oylik' : '1 yillik'})
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Muddati: {profile.subscriptionExpiry || '2027'} yilgacha
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white shrink-0">
            Faol
          </span>
        </div>
      )}

      {/* Gemini AI P2P Receipt Verification Banner */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                P2P Chekni Tekshirish
              </h3>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white uppercase">
                Gemini AI ⚡
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
              Click, Payme yoki Uzum chekingizni yuklang, sun'iy intellekt 5 soniyada obunani ochadi!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setReceiptPlan('6_months');
            setIsReceiptModalOpen(true);
          }}
          className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Chekni yuklash</span>
        </button>
      </div>

      {/* SECTION 1: Subscription Plans (Mobile Adapted) */}
      <div className="space-y-3">
        {/* Section Header with Accent Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Obuna Rejalari (3 xil muddat)
            </h3>
          </div>
          {hasVoucher && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
              -20 000 vaucher chegirmasi
            </span>
          )}
        </div>

        {/* 1. 3-Month Plan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-4 shadow-xs relative overflow-hidden transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  3 Oylik Reja
                </span>
                {profile.subscriptionPlan === '3_months' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                    Joriy rejangiz
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                3 oylik Premium
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Oraliq va yakuniy nazoratlarga tezkor tayyorgarlik kursi (90 kun)
              </p>
            </div>

            <div className="text-right shrink-0">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  {price3M.toLocaleString('uz-UZ')} so'm
                </span>
              )}
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {cost3Months.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          {/* Plan Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2.5">
            <div className="flex items-center justify-between text-[11px] mb-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                {hasVoucher ? (
                  <>
                    <Check className="w-3.5 h-3.5 inline text-emerald-500" strokeWidth={2} />
                    <span>20 000 vaucher chegirmasi bilan</span>
                  </>
                ) : (
                  <span>90 kunlik to'liq kirish</span>
                )}
              </span>
              <span className="text-slate-400 font-medium text-[10px]">
                Oraliq nazorat
              </span>
            </div>

            {/* Mobile Full-Width Action Button */}
            {canAfford3M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('3_months')}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {profile.subscriptionPlan === '3_months' ? 'Muddati uzaytirish' : 'Faollashtirish'}
                </span>
                <span className="text-[11px] opacity-80">({cost3Months.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenInstruction('3_months', deficit3M)}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" strokeWidth={1.75} />
                <span>To'lov yo'riqnomasi ({deficit3M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}

            {!canAfford3M && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-semibold text-center">
                Balansingizda {currentBalance.toLocaleString('uz-UZ')} so'm mavjud. Obunani ochish uchun {deficit3M.toLocaleString('uz-UZ')} so'm kerak.
              </p>
            )}
          </div>
        </div>

        {/* 2. 6-Month Plan (Recommended) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-4 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  Tavsiya etiladi (6 oy)
                </span>
                {profile.subscriptionPlan === '6_months' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                    Joriy rejangiz
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                6 oylik Premium
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Barcha fanlar, HEMIS va sertifikat testlari bazasi (180 kun)
              </p>
            </div>

            <div className="text-right shrink-0">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  {price6M.toLocaleString('uz-UZ')} so'm
                </span>
              )}
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {cost6Months.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          {/* Plan Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2.5">
            <div className="flex items-center justify-between text-[11px] mb-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                {hasVoucher ? (
                  <>
                    <Check className="w-3.5 h-3.5 inline text-emerald-500" strokeWidth={2} />
                    <span>20 000 vaucher chegirmasi bilan</span>
                  </>
                ) : (
                  <span>180 kunlik to'liq kirish</span>
                )}
              </span>
              <span className="text-amber-500 font-bold text-[10px]">
                Eng ommabop
              </span>
            </div>

            {/* Mobile Full-Width Action Button */}
            {canAfford6M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('6_months')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {profile.subscriptionPlan === '6_months' ? 'Muddati uzaytirish' : 'Faollashtirish'}
                </span>
                <span className="text-[11px] opacity-80">({cost6Months.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenInstruction('6_months', deficit6M)}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-amber-400 dark:text-amber-600 shrink-0" strokeWidth={1.75} />
                <span>To'lov yo'riqnomasi ({deficit6M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}

            {!canAfford6M && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-semibold text-center">
                Balansingizda {currentBalance.toLocaleString('uz-UZ')} so'm mavjud. Obunani ochish uchun {deficit6M.toLocaleString('uz-UZ')} so'm kerak.
              </p>
            )}
          </div>
        </div>

        {/* 3. 1-Year Plan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-4 shadow-xs relative overflow-hidden transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  To'liq 1 Yil (365 kun)
                </span>
                {profile.subscriptionPlan === '1_year' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                    Joriy rejangiz
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                1 yillik Premium
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Butun o'quv yili uchun cheksiz to'liq kafolatlangan kirish
              </p>
            </div>

            <div className="text-right shrink-0">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  {price1Y.toLocaleString('uz-UZ')} so'm
                </span>
              )}
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {cost1Year.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          {/* Plan Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2.5">
            <div className="flex items-center justify-between text-[11px] mb-2.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                {hasVoucher ? (
                  <>
                    <Check className="w-3.5 h-3.5 inline text-emerald-500" strokeWidth={2} />
                    <span>20 000 vaucher chegirmasi bilan</span>
                  </>
                ) : (
                  <span>365 kunlik cheksiz kirish</span>
                )}
              </span>
              <span className="text-emerald-500 font-bold text-[10px]">
                To'liq yil
              </span>
            </div>

            {/* Mobile Full-Width Action Button */}
            {canAfford1Y ? (
              <button
                type="button"
                onClick={() => handleSubscribe('1_year')}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {profile.subscriptionPlan === '1_year' ? 'Muddati uzaytirish' : 'Faollashtirish'}
                </span>
                <span className="text-[11px] opacity-80">({cost1Year.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenInstruction('1_year', deficit1Y)}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" strokeWidth={1.75} />
                <span>To'lov yo'riqnomasi ({deficit1Y.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}

            {!canAfford1Y && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-semibold text-center">
                Balansingizda {currentBalance.toLocaleString('uz-UZ')} so'm mavjud. Obunani ochish uchun {deficit1Y.toLocaleString('uz-UZ')} so'm kerak.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Promocode Activation (Adds Balance Directly) */}
      <div className="space-y-2 pt-1">
        {/* Section Header with Accent Bar */}
        <div className="flex items-center gap-2 px-1">
          <span className="w-1.5 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Promokod orqali balansni to'ldirish
          </h3>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Admindan olingan promokod
            </span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            To'lov chekingizni botga yuborganingizdan so'ng admindan olgan maxsus promokodingizni kiriting. Promokod summasi balansingizga qo'shiladi!
          </p>

          <form onSubmit={handleActivatePromo} className="space-y-2.5">
            <input
              ref={promoInputRef}
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Masalan: YUK-15K-8291"
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
            />
            <button
              type="submit"
              disabled={!promoInput.trim() || promoLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
              <span>Balansga qo'shish</span>
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 3: Official Card Requisites & Check Submission */}
      <div className="space-y-2 pt-1">
        {/* Section Header with Accent Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              To'lov Rekvizitlari
            </h3>
          </div>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Admin tasdiqi: 24 soat
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Hamyoningizni to'ldirish uchun quyidagi rasmiy to'lov usulini tanlang, pul o'tkazing va to'lov kvitansiyasini (chek) botimizga yuboring:
          </p>

          {/* Payment Method Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {availablePaymentMethods.map((pm) => {
              const isSelected = pm.id === currentPaymentMethod?.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedPmId(pm.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {pm.name}
                </button>
              );
            })}
          </div>

          {/* Primary Official Card Display */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                To'lov usuli: <b className="text-slate-900 dark:text-white">{currentPaymentMethod?.name}</b>
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                0% Komissiya
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="font-mono font-black text-sm sm:text-base tracking-wider text-slate-900 dark:text-white select-all truncate">
                {currentPaymentMethod?.details}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCardNumber(currentPaymentMethod?.details)}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                {copiedCard ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] text-emerald-600 font-bold">Nusxalandi</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span className="text-[11px]">Nusxa olish</span>
                  </>
                )}
              </button>
            </div>

            {currentPaymentMethod?.instructions && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                {currentPaymentMethod.instructions}
              </p>
            )}
          </div>

          {/* 4 Step Process Explanation */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-2 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Kartaga kerakli summani (masalan: 15 000, 30 000 yoki 70 000 so'm) o'tkazing.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>To'lov chekini rasmga olib, Telegram botimizga yuboring: <b>@YuksalQuiz_bot</b> va <b>"Men to'lov qildim"</b> deb yozing.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Admin to'lovni 24 soat ichida tekshirib, sizga maxsus <b>Promokod</b> yuboradi.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>Promokodni yuqoridagi maydonga kiritib, balansingizni to'ldirasiz va obunani faollashtirasiz!</span>
            </div>
          </div>

          {/* Telegram Bot Action Button */}
          <a
            href="https://t.me/YuksalQuiz_bot?text=Men%20to'lov%20qildim"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerHaptic('medium')}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>Chekni botga yuborish: "Men to'lov qildim" (@YuksalQuiz_bot)</span>
          </a>
        </div>
      </div>

      {/* SECTION 4: Referral Card */}
      <ReferralShareCard />

      {/* SECTION 5: Mandatory Guardrail Notice (At the very bottom) */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs font-semibold leading-relaxed">
          <span className="font-extrabold block mb-0.5">{t.guardrailNoticeTitle}</span>
          {t.guardrailNoticeText}
        </p>
      </div>

      {/* INSTRUCTIONAL PAYMENT MODAL (Opens on "To'lov yo'riqnomasi") */}
      {instructionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    To'lov Yo'riqnomasi
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {instructionModal.planTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseInstruction}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Target Plan Summary */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Kerakli to'lov summasi:
                  </span>
                  <span className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                    {instructionModal.amount.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  20k vaucher qo'llandi
                </span>
              </div>

              {/* Requisites Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    To'lov usuli: <b className="text-slate-900 dark:text-white">{currentPaymentMethod?.name}</b>
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    0% Komissiya
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="font-mono font-black text-sm tracking-wider text-slate-900 dark:text-white select-all truncate">
                    {currentPaymentMethod?.details}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCardNumber(currentPaymentMethod?.details)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0"
                  >
                    {copiedCard ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                        <span className="text-[10px] text-emerald-600 font-bold">Nusxalandi</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span className="text-[10px]">Nusxa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-2 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Payme, Click, Uzum yoki bank ilovangiz orqali yuqoridagi kartaga <b>{instructionModal.amount.toLocaleString('uz-UZ')} so'm</b> o'tkazing.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>To'lov chekini rasmga oling yoki skrinshot qiling.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Quyidagi tugma orqali Telegram botimizga chekni yuboring va <b>"Men to'lov qildim"</b> deb yozing.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <span>Admin to'lovni 24 soat ichida tasdiqlab, sizga maxsus <b>Promokod</b> beradi.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                  <span>Promokodni kiritib, balansingizni to'ldirasiz va obunani faollashtirasiz!</span>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const p = instructionModal.plan;
                    handleCloseInstruction();
                    setReceiptPlan(p);
                    setIsReceiptModalOpen(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" strokeWidth={2} />
                  <span>Chekni Gemini AI orqali tekshirish (Tezkor)</span>
                </button>

                <a
                  href="https://t.me/YuksalQuiz_bot?text=Men%20to'lov%20qildim"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('medium')}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                  <span>Chekni botga yuborish (@YuksalQuiz_bot)</span>
                </a>

                <button
                  type="button"
                  onClick={handleGoToPromocode}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Menda promokod bor, kiritish</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <History className="w-4 h-4" strokeWidth={1.75} />
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
                <X className="w-4 h-4" strokeWidth={1.75} />
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
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
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
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" strokeWidth={1.75} />
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
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Ticket className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                          );
                        case 'referral':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                              <Share2 className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                          );
                        case 'coin':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <Coins className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                          );
                        case 'author_reward':
                          return (
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Award className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                          );
                        case 'deposit':
                        default:
                          return (
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <CreditCard className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                          );
                      }
                    };

                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
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
                            className={`text-xs font-black px-2.5 py-1 rounded-lg inline-block ${
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
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P2P RECEIPT AI VERIFICATION MODAL */}
      <ReceiptVerifyModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        initialPlan={receiptPlan}
      />
    </div>
  );
};
