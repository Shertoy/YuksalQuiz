import React, { useState, useRef, useEffect } from 'react';
import { useQuizStore, DEFAULT_SUBSCRIPTION_PRICES } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Wallet,
  Ticket,
  Crown,
  History,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  ArrowRight,
  CreditCard,
  X,
  RefreshCw,
  Zap,
  Coins,
  Share2,
  Award,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiPost, apiErrorText } from '../services/api';
import { triggerHaptic, soundFX, generateReferralLink, getTelegramWebApp } from '../utils/telegram';
import { isPaidUser, getSubscriptionRemainingDays } from '../services/paywallService';
import { SubscriptionPlanType, TransactionType } from '../types';
import { compressReceiptImage, formatBytes } from '../utils/imageCompressor';
import {
  uploadReceiptToStorage,
  recordReceiptPayment,
  fetchUserLatestPendingPayment,
  checkPaymentStatus,
} from '../services/receiptService';

export const WalletView: React.FC = () => {
  const {
    profile,
    applySubscription,
    depositBalance,
    subscriptionPrices,
    transactions,
    refreshBalance,
  } = useQuizStore();
  const { t } = useTranslation();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | TransactionType>('all');
  const [showExtendPlans, setShowExtendPlans] = useState(false);

  // Realtime Polling & Balance Sync State
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null);
  const initialBalanceRef = useRef(profile.walletBalance || profile.balance || 0);
  const celebratedRef = useRef(false);

  // 1. Hamyon sahifasi ochilganda Supabase'dan joriy balans va obunani majburiy darhol yangilash
  useEffect(() => {
    initialBalanceRef.current = profile.walletBalance || profile.balance || 0;
    refreshBalance();
    if (profile.id) {
      fetchUserLatestPendingPayment(profile.id).then((pending) => {
        if (pending?.id && !celebratedRef.current) {
          setPendingPaymentId(pending.id);
        }
      });
    }
  }, [profile.id]);

  // 2. Agar to'lov kutilayotgan holatda bo'lsa yoki hozirgina chek yuborilgan bo'lsa:
  // har 3 soniyada payments va users.balance tekshirilsin (Realtime/polling)
  useEffect(() => {
    if (!pendingPaymentId) return;

    let isMounted = true;
    let inFlight = false;
    const interval = setInterval(async () => {
      // Oldingi tekshiruv tugamagan bo'lsa yangisini boshlamaymiz (sekin internetda so'rovlar to'planmasin)
      if (inFlight) return;
      inFlight = true;
      try {
      // 1. Serverdan eng so'nggi balansni yangilash
      const freshBal = await refreshBalance();

      // 2. To'lov ID orqali holatni tekshirish
      if (pendingPaymentId !== 'latest') {
        const payRes = await checkPaymentStatus(pendingPaymentId);
        if (
          payRes?.status === 'approved' ||
          payRes?.status === 'auto_approved' ||
          payRes?.status === 'manual_approved'
        ) {
          if (!isMounted) return;
          setPendingPaymentId(null);
          if (freshBal !== null) {
            initialBalanceRef.current = freshBal;
          }
          if (!celebratedRef.current) {
            celebratedRef.current = true;
            triggerHaptic('success');
            soundFX.playSuccess();
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
            setSuccessPopupMessage("✅ Hisobingiz muvaffaqiyatli to'ldirildi!");
            setFeedback({
              type: 'success',
              message: "✅ Hisobingiz muvaffaqiyatli to'ldirildi!",
            });
          }
          return;
        }

        if (
          payRes?.status === 'rejected' ||
          payRes?.status === 'manual_rejected'
        ) {
          if (!isMounted) return;
          setPendingPaymentId(null);
          triggerHaptic('error');
          soundFX.playError();
          setFeedback({
            type: 'error',
            message: "Administrator to'lov kvitansiyasini rad etdi. Iltimos, haqiqiy chekni yuklang.",
          });
          return;
        }
      }

      // 3. Agar balans boshlang'ichdan oshgan bo'lsa, bir zumda tasdiqlash
      if (freshBal !== null && freshBal > initialBalanceRef.current) {
        if (!isMounted) return;
        setPendingPaymentId(null);
        initialBalanceRef.current = freshBal;
        if (!celebratedRef.current) {
          celebratedRef.current = true;
          triggerHaptic('success');
          soundFX.playSuccess();
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
          setSuccessPopupMessage("✅ Hisobingiz muvaffaqiyatli to'ldirildi!");
          setFeedback({
            type: 'success',
            message: "✅ Hisobingiz muvaffaqiyatli to'ldirildi!",
          });
        }
      }
      } finally {
        inFlight = false;
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pendingPaymentId]);

  // Receipt Upload State (Section C)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedBase64, setCompressedBase64] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStepText, setVerifyStepText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requisitesRef = useRef<HTMLDivElement>(null);

  const CARD_RAW = '9860080382320093';
  const CARD_FORMATTED = '9860 0803 8232 0093';
  const CARD_HOLDER = 'Alijonova Xalimaxon';

  const currentBalance = profile.walletBalance ?? profile.balance ?? 0;
  const currentVoucher = profile.voucherBalance || 0;
  const voucherDiscount = 0; // vaucher claim qilinganda balansga qo'shiladi, chegirma emas
  const hasVoucher = voucherDiscount > 0;

  const isSubscribed = isPaidUser(profile);
  const remainingDays = getSubscriptionRemainingDays(profile);
  const isEndingSoon = remainingDays !== null && remainingDays <= 10 && remainingDays > 0;

  // Plan Pricing
  const prices = subscriptionPrices || DEFAULT_SUBSCRIPTION_PRICES;
  const price3M = prices['3_months'] || 35000;
  const price6M = prices['6_months'] || 60000;
  const price1Y = prices['1_year'] || 100000;

  const cost3M = hasVoucher ? Math.max(0, price3M - voucherDiscount) : price3M;
  const cost6M = hasVoucher ? Math.max(0, price6M - voucherDiscount) : price6M;
  const cost1Y = hasVoucher ? Math.max(0, price1Y - voucherDiscount) : price1Y;

  const canAfford3M = currentBalance >= cost3M;
  const deficit3M = Math.max(0, cost3M - currentBalance);

  const canAfford6M = currentBalance >= cost6M;
  const deficit6M = Math.max(0, cost6M - currentBalance);

  const canAfford1Y = currentBalance >= cost1Y;
  const deficit1Y = Math.max(0, cost1Y - currentBalance);

  // Referral Data
  const refCount = profile.referralCount || 0;
  const refEarnings = refCount * 1000;
  const inviteLink = generateReferralLink(profile.id);

  const handleCopyCard = () => {
    triggerHaptic('light');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(CARD_RAW);
    }
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleCopyReferral = async () => {
    triggerHaptic('light');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedRef(true);
      triggerHaptic('success');
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {
      triggerHaptic('error');
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlanType) => {
    triggerHaptic('medium');
    const res = await applySubscription(plan);
    if (res.success) {
      triggerHaptic('success');
      soundFX.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setFeedback({ type: 'success', message: res.message });
    } else {
      triggerHaptic('error');
      soundFX.playError();
      setFeedback({ type: 'error', message: res.message });
    }
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleScrollToRequisites = (_deficit: number) => {
    triggerHaptic('light');
    requisitesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError("Faqat rasm formatidagi kvitansiyalar qabul qilinadi (JPG, PNG, WebP)");
      triggerHaptic('error');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Client-side Compression down to max 300 KB
    setIsCompressing(true);
    try {
      const compResult = await compressReceiptImage(file, 300 * 1024);
      setCompressedBlob(compResult.blob);
      setCompressedBase64(compResult.base64);
      setCompressedSize(compResult.compressedSize);
    } catch (err) {
      console.warn('Compression error fallback:', err);
      setCompressedBlob(file);
      setCompressedSize(file.size);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressedBlob(null);
    setCompressedBase64(null);
    setCompressedSize(0);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendReceipt = async () => {
    if (!selectedFile) {
      setUploadError("Iltimos, avval to'lov kvitansiyasi rasmini tanlang.");
      triggerHaptic('warning');
      return;
    }

    setIsVerifying(true);
    setUploadError(null);
    triggerHaptic('medium');

    try {
      setVerifyStepText("Kvitansiya tayyorlanmoqda...");
      let base64Data = compressedBase64;
      if (!base64Data) {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      }

      setVerifyStepText("Gemini AI tahlil qilmoqda...");

      // Server Telegram imzosi yoki foydalanuvchi ma'lumotlari orqali foydalanuvchini aniqlaydi
      const apiRes = await apiPost('/api/verify-receipt', {
        image: base64Data,
        mimeType: 'image/jpeg',
        expectedAmount: 0,
        userId: profile.id || profile.telegramId || profile.telegram_id || '',
        userName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Talaba',
        userUsername: profile.username || '',
      });
      setVerifyStepText("Anti-cheat va tranzaksiya tekshirilmoqda...");
      const data: any = apiRes.data;

      if (!apiRes.ok && !data.status) {
        triggerHaptic('error');
        soundFX.playError();
        setUploadError(apiErrorText(apiRes, "Chekni yuborib bo'lmadi. Qayta urinib ko'ring."));
        return;
      }

      if (data.status === 'approved') {
        const creditedAmount = data.amount || 0;
        const txId = data.transactionId || `PAY_${Date.now()}`;

        // Deposit balance directly in local store
        depositBalance(creditedAmount, txId);
        useQuizStore.getState().syncUser();

        triggerHaptic('success');
        soundFX.playSuccess();
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });

        setSuccessPopupMessage("✅ Hisobingiz muvaffaqiyatli to'ldirildi!");
        setFeedback({
          type: 'success',
          message: `To'lov muvaffaqiyatli tasdiqlandi! Balansingizga +${creditedAmount.toLocaleString('uz-UZ')} so'm qo'shildi.`,
        });

        handleClearSelectedFile();
      } else if (data.status === 'pending') {
        celebratedRef.current = false;
        initialBalanceRef.current = profile.walletBalance || 0;
        setPendingPaymentId(data.paymentId || 'latest');
        triggerHaptic('warning');
        setFeedback({
          type: 'success',
          message: data.message || "Chek qabul qilindi va admin ko'rigiga yo'naltirildi. Tez orada balansingizga qo'shiladi.",
        });
        handleClearSelectedFile();
      } else {
        triggerHaptic('error');
        soundFX.playError();
        setUploadError(data.message || data.reason || "Kvitansiya tasdiqlanmadi. Iltimos, haqiqiy to'lov chekini yuklang.");
      }
    } catch (err: any) {
      console.error('Verify receipt exception:', err);
      triggerHaptic('error');
      setUploadError("Server bilan bog'lanishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setIsVerifying(false);
      setVerifyStepText('');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={1.75} />
            <span>{t.walletTitle || 'Hamyon'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.walletSubtitle}
          </p>
        </div>

        {/* History Trigger Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setShowHistoryModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95 transition-all shrink-0"
        >
          <History className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
          <span>{t.walletHistoryTitle}</span>
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

      {/* Pending verification status banner */}
      {pendingPaymentId && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-3 text-amber-850 dark:text-amber-200 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-ping" />
            <div className="min-w-0">
              <p className="font-extrabold truncate">Kvitansiya tekshirilmoqda...</p>
              <p className="text-[11px] opacity-80 truncate">Administrator tasdiqlashi kutilmoqda (har 4 soniyada tekshirilmoqda)</p>
            </div>
          </div>
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-amber-500" />
        </div>
      )}

      {/* =========================================================================
          1. BALANS BLOKI (BALANCE BLOCK)
         ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/80 border border-emerald-500/25 text-white rounded-3xl p-5 shadow-xl shadow-emerald-950/30 relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

        {/* Balance Title & Amount */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider block mb-1">
              {t.walletBalanceTitle}
            </span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
              {currentBalance.toLocaleString('uz-UZ')} so'm
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Wallet className="w-5 h-5 text-emerald-300" strokeWidth={1.75} />
          </div>
        </div>

        {/* Active Subscription Status (if user is currently subscribed) */}
        {isPaidUser(profile) && (
          <div className="relative z-10 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white truncate">
                  {profile.subscriptionPlan === '1_year' ? '1 yillik' : profile.subscriptionPlan === '6_months' ? '6 oylik' : '3 oylik'} Premium obuna faol
                </p>
                <p className="text-[10px] text-amber-200">
                  Amal qilish muddati: {profile.subscriptionExpiry || (profile.paid_until ? profile.paid_until.split('T')[0] : "Cheksiz")} gacha
                </p>
              </div>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 uppercase shrink-0">
              Faol
            </span>
          </div>
        )}

        {/* Starting Voucher Indicator (20 000 UZS starting gift) */}
        {hasVoucher && (
          <div className="relative z-10 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-sm">
              <Ticket className="w-4 h-4 text-slate-950" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white">
                  {t.walletVoucherActiveBanner}
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 uppercase">
                  Faol
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 mt-0.5 leading-snug">
                {t.walletVoucherDesc}
              </p>
            </div>
          </div>
        )}

        {/* Small Referral Row: "Takliflar: {ref_count} ta • {ref_earnings} so'm" */}
        <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <div className="text-emerald-200 font-bold flex items-center gap-1.5 truncate">
              <span>Takliflar: {refCount} ta • {refEarnings.toLocaleString('uz-UZ')} so'm</span>
            </div>
            <span className="text-[10px] text-emerald-300/70 block mt-0.5">
              Har bir do'st uchun 1 000 so'm
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyReferral}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
          >
            {copiedRef ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" strokeWidth={2} />
                <span className="text-[11px] text-emerald-200">Nusxalandi</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                <span className="text-[11px]">Nusxa olish</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. TARIFLAR BLOKI (3 TA KARTA)
         ========================================================================= */}
      {isPaidUser(profile) && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 rounded-3xl p-5 text-white shadow-xl space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-orange-500/30 shrink-0">
              <Star className="w-6 h-6 fill-slate-950 text-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {profile.subscriptionPlan === '1_year' ? '1 yillik' : profile.subscriptionPlan === '6_months' ? '6 oylik' : '3 oylik'} Premium obuna faol
                </h4>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  Faol
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-1">
                Amal qilish muddati: <b className="text-white">{profile.subscriptionExpiry || (profile.paid_until ? profile.paid_until.split('T')[0] : "Cheksiz")}</b> gacha
                {remainingDays !== null && ` (${remainingDays} kun qoldi)`}
              </p>
            </div>
          </div>

          {/* 10-day expiration warning */}
          {isEndingSoon && (
            <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/60 flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-extrabold text-amber-300 block text-sm">
                  ⚠️ Obunangiz tugashiga {remainingDays} kun qoldi!
                </span>
                <span className="text-[11px] text-amber-100/90 mt-0.5 block">
                  Barcha testlarga to'siqsiz kirishni davom ettirish uchun hamyon mablag'ingizdan foydalanib muddatni hoziroq uzaytirishingiz mumkin.
                </span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200 flex items-center justify-between">
            <span>Barcha HEMIS va fan testlariga to'liq cheksiz kirish yoqilgan</span>
            <span className="font-mono font-bold text-emerald-300">VIP</span>
          </div>

          {/* Extend button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowExtendPlans((prev) => !prev);
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-bold text-white border border-white/20 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{showExtendPlans ? "Tariflarni yashirish" : "Obuna muddatini uzaytirish / Yangi tarif tanlash"}</span>
          </button>
        </div>
      )}

      {(!isPaidUser(profile) || showExtendPlans || isEndingSoon) && (
        <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {isPaidUser(profile) ? "Obunani Uzaytirish Tariflari" : "Obuna Tariflari"}
            </h3>
          </div>
          {hasVoucher && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              -20 000 vaucher chegirmasi bilan
            </span>
          )}
        </div>

        {/* CARD 1: 3 Oylik (asl 35 000 -> vaucher bilan 15 000) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs relative overflow-hidden transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                {isPaidUser(profile) ? "3 Oylik (+90 kun qo'shiladi)" : "3 Oylik Reja"}
              </span>
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
                {cost3M.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2.5">
            {canAfford3M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('3_months')}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isPaidUser(profile) ? "Obunani uzaytirish" : "Obunani yoqish"}</span>
                <span className="text-[11px] opacity-80">({cost3M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScrollToRequisites(deficit3M)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" strokeWidth={1.75} />
                <span>Hisobni to'ldirish (yana {deficit3M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: 6 Oylik (Tavsiya etiladi - asl 60 000 -> vaucher bilan 40 000) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-4 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                {isPaidUser(profile) ? "Tavsiya etiladi (+180 kun qo'shiladi)" : "Tavsiya etiladi (6 oy)"}
              </span>
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
                {cost6M.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2.5">
            {canAfford6M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('6_months')}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isPaidUser(profile) ? "Obunani uzaytirish" : "Obunani yoqish"}</span>
                <span className="text-[11px] opacity-80">({cost6M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScrollToRequisites(deficit6M)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-amber-400 dark:text-amber-600 shrink-0" strokeWidth={1.75} />
                <span>Hisobni to'ldirish (yana {deficit6M.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 3: 1 Yillik (asl 100 000 -> vaucher bilan 80 000) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs relative overflow-hidden transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                {isPaidUser(profile) ? "1 Yil (+365 kun qo'shiladi)" : "To'liq 1 Yil (365 kun)"}
              </span>
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
                {cost1Y.toLocaleString('uz-UZ')} so'm
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2.5">
            {canAfford1Y ? (
              <button
                type="button"
                onClick={() => handleSubscribe('1_year')}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isPaidUser(profile) ? "Obunani uzaytirish" : "Obunani yoqish"}</span>
                <span className="text-[11px] opacity-80">({cost1Y.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScrollToRequisites(deficit1Y)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" strokeWidth={1.75} />
                <span>Hisobni to'ldirish (yana {deficit1Y.toLocaleString('uz-UZ')} so'm)</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* =========================================================================
          3. REKVIZITLAR VA KVITANSIYANI DARHOL YUKLASH BLOKI
         ========================================================================= */}
      <div ref={requisitesRef} className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <span className="w-1.5 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t.walletP2PTitle}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          {/* Card Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {t.walletCardHolderLabel} <b className="text-slate-900 dark:text-white">{CARD_HOLDER}</b>
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Humo • {t.walletZeroCommission}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="font-mono font-black text-base sm:text-lg tracking-wider text-slate-900 dark:text-white select-all truncate">
                {CARD_FORMATTED}
              </span>
              <button
                type="button"
                onClick={handleCopyCard}
                className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                {copiedCard ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    <span className="text-[11px] text-emerald-600 font-bold">{t.walletCardCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span className="text-[11px]">{t.walletCopyCardBtn}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.walletP2PDesc}
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Dropzone / Preview */}
          {!selectedFile ? (
            <div
              onClick={() => {
                triggerHaptic('light');
                fileInputRef.current?.click();
              }}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/20 space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.walletUploadReceiptTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.walletUploadReceiptDesc}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Chek"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isCompressing
                      ? "Siqilmoqda..."
                      : `Hajmi: ${formatBytes(compressedSize || selectedFile.size)}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearSelectedFile}
                disabled={isVerifying}
                className="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex-1 leading-relaxed">
                {uploadError}
              </div>
            </div>
          )}

          {/* Verification Status Banner */}
          {isVerifying && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-emerald-600" strokeWidth={2} />
              <span>{verifyStepText || "Gemini AI kvitansiyani tekshirmoqda..."}</span>
            </div>
          )}

          {/* Action Button: "Kvitansiyani yuborish" */}
          <button
            type="button"
            onClick={handleSendReceipt}
            disabled={!selectedFile || isVerifying || isCompressing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" strokeWidth={2} />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" strokeWidth={2} />
                <span>{t.walletSendReceiptBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          TRANSAKSIYALAR TARIXI MODALI
         ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <History className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Tranzaksiyalar Tarixi
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Barcha to'lovlar va mukofotlar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-3 overflow-x-auto border-b border-slate-100 dark:border-slate-800 text-[11px] scrollbar-none shrink-0">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'deposit', label: "To'lovlar" },
                { id: 'voucher', label: 'Vaucherlar' },
                { id: 'referral', label: 'Referal' },
                { id: 'coin', label: 'Tangalar' },
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
            <div className="overflow-y-auto overscroll-contain p-5 pb-8 space-y-4 flex-1">
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
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-right shrink-0">
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

      {/* Pop-up: Hisob muvaffaqiyatli to'ldirildi */}
      {successPopupMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {successPopupMessage}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                To'lovingiz administrator tomonidan tasdiqlandi. Hamyon balansingiz yangilandi!
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              Joriy balans: {(profile.walletBalance || 0).toLocaleString('uz-UZ')} so'm
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSuccessPopupMessage(null);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
            >
              Ajoyib, tushunarli!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
