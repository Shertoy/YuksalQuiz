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
  const { t, tr } = useTranslation();
  const SOM = tr("so'm", 'сум', 'UZS');

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
            message: tr(
            "Administrator chekni rad etdi. Haqiqiy to'lov chekini yuklang.",
            'Администратор отклонил чек. Загрузите настоящий чек об оплате.',
            'The admin rejected the receipt. Please upload a real payment receipt.'
          ),
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
      setUploadError(tr('Faqat rasm qabul qilinadi (JPG, PNG, WebP)', 'Принимаются только изображения (JPG, PNG, WebP)', 'Only images are accepted (JPG, PNG, WebP)'));
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
      setUploadError(tr("Avval to'lov chekining rasmini tanlang.", 'Сначала выберите фото чека.', 'Choose a photo of the receipt first.'));
      triggerHaptic('warning');
      return;
    }

    setIsVerifying(true);
    setUploadError(null);
    triggerHaptic('medium');

    try {
      setVerifyStepText(tr('Chek tayyorlanmoqda...', 'Подготовка чека...', 'Preparing receipt...'));
      let base64Data = compressedBase64;
      if (!base64Data) {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      }

      setVerifyStepText(tr('Chek tekshirilmoqda...', 'Проверка чека...', 'Checking receipt...'));

      // Server Telegram imzosi yoki foydalanuvchi ma'lumotlari orqali foydalanuvchini aniqlaydi
      const apiRes = await apiPost('/api/verify-receipt', {
        image: base64Data,
        mimeType: 'image/jpeg',
        expectedAmount: 0,
        userId: profile.id || profile.telegramId || profile.telegram_id || '',
        userName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Talaba',
        userUsername: profile.username || '',
      });
      setVerifyStepText(tr("To'lov ma'lumotlari solishtirilmoqda...", 'Сверка данных платежа...', 'Matching payment details...'));
      const data: any = apiRes.data;

      if (!apiRes.ok && !data.status) {
        triggerHaptic('error');
        soundFX.playError();
        setUploadError(apiErrorText(apiRes, tr("Chekni yuborib bo'lmadi. Qayta urinib ko'ring.", 'Не удалось отправить чек. Попробуйте ещё раз.', 'Could not send the receipt. Try again.')));
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
          message: tr(
            `To'lov tasdiqlandi. Balansingizga +${creditedAmount.toLocaleString('uz-UZ')} so'm qo'shildi.`,
            `Платёж подтверждён. На баланс зачислено +${creditedAmount.toLocaleString('uz-UZ')} сум.`,
            `Payment confirmed. +${creditedAmount.toLocaleString('uz-UZ')} UZS added to your balance.`
          ),
        });

        handleClearSelectedFile();
      } else if (data.status === 'pending') {
        celebratedRef.current = false;
        initialBalanceRef.current = profile.walletBalance || 0;
        setPendingPaymentId(data.paymentId || 'latest');
        triggerHaptic('warning');
        setFeedback({
          type: 'success',
          message:
              data.message ||
              tr(
                "Chek qabul qilindi va admin ko'rigiga yuborildi. Tez orada balansingizga qo'shiladi.",
                'Чек принят и отправлен на проверку. Скоро средства поступят на баланс.',
                'Receipt received and sent for review. Funds will be added soon.'
              ),
        });
        handleClearSelectedFile();
      } else {
        triggerHaptic('error');
        soundFX.playError();
        setUploadError(
          data.message ||
            data.reason ||
            tr("Chek tasdiqlanmadi. Haqiqiy to'lov chekini yuklang.", 'Чек не подтверждён. Загрузите настоящий чек.', 'Receipt not confirmed. Upload a real payment receipt.')
        );
      }
    } catch (err: any) {
      console.error('Verify receipt exception:', err);
      triggerHaptic('error');
      setUploadError(tr("Server bilan aloqa yo'q. Qayta urinib ko'ring.", 'Нет связи с сервером. Попробуйте ещё раз.', 'Cannot reach the server. Try again.'));
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={1.75} />
            <span>{t.walletTitle || 'Hamyon'}</span>
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
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
          role="status"
          className={`px-4 py-3 rounded-xl text-[13px] font-medium animate-in fade-in flex items-start gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100'
              : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-100'
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
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-100 text-[13px] animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            
            <div className="min-w-0">
              <p className="font-semibold truncate">{tr('Chek tekshirilmoqda...', 'Чек проверяется...', 'Receipt is being checked...')}</p>
              <p className="text-[12px] opacity-80">
                {tr(
                  'Odatda bir necha daqiqa davom etadi. Sahifani yopsangiz ham tekshiruv davom etadi.',
                  'Обычно занимает несколько минут. Проверка продолжится, даже если закрыть страницу.',
                  'Usually takes a few minutes. It continues even if you close the page.'
                )}
              </p>
            </div>
          </div>
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-amber-500" />
        </div>
      )}

      {/* =========================================================================
          1. BALANS BLOKI (BALANCE BLOCK)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">

        {/* Balance Title & Amount */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] block mb-1">
              {t.walletBalanceTitle}
            </span>
            <div className="text-3xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-50 tabular-nums">
              {currentBalance.toLocaleString('uz-UZ')} {SOM}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" strokeWidth={1.75} />
          </div>
        </div>

        {/* Active Subscription Status (if user is currently subscribed) */}
        {isPaidUser(profile) && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50 truncate">
                  {profile.subscriptionPlan === '1_year' ? '1 yillik' : profile.subscriptionPlan === '6_months' ? '6 oylik' : '3 oylik'} Premium obuna faol
                </p>
                <p className="text-[12px] text-amber-800 dark:text-amber-200">
                  Amal qilish muddati: {profile.subscriptionExpiry || (profile.paid_until ? profile.paid_until.split('T')[0] : "Cheksiz")} gacha
                </p>
              </div>
            </div>
            <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
              Faol
            </span>
          </div>
        )}

        {/* Starting Voucher Indicator (20 000 UZS starting gift) */}
        {hasVoucher && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                  {t.walletVoucherActiveBanner}
                </span>
                <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Faol
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {t.walletVoucherDesc}
              </p>
            </div>
          </div>
        )}

        {/* Small Referral Row: "Takliflar: {ref_count} ta • {ref_earnings} so'm" */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
              <span>{tr('Takliflar', 'Приглашения', 'Invites')}: {refCount} · {refEarnings.toLocaleString('uz-UZ')} {SOM}</span>
            </div>
            <span className="text-[12px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {tr("Har bir do'st uchun 1 000 so'm", 'За каждого друга 1 000 сум', '1,000 UZS per friend')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyReferral}
            className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-[13px] flex items-center gap-1.5 active:bg-slate-50 dark:active:bg-slate-800 shrink-0"
          >
            {copiedRef ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                <span>{tr('Nusxalandi', 'Скопировано', 'Copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{tr('Havolani nusxalash', 'Копировать ссылку', 'Copy link')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. TARIFLAR BLOKI (3 TA KARTA)
         ========================================================================= */}
      {isPaidUser(profile) && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-[15px] text-slate-900 dark:text-slate-50">
                  {profile.subscriptionPlan === '1_year' ? '1 yillik' : profile.subscriptionPlan === '6_months' ? '6 oylik' : '3 oylik'} Premium obuna faol
                </h4>
                <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Faol
                </span>
              </div>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                Amal qilish muddati: <b className="text-slate-900 dark:text-slate-50 font-semibold">{profile.subscriptionExpiry || (profile.paid_until ? profile.paid_until.split('T')[0] : "Cheksiz")}</b> gacha
                {remainingDays !== null && ` (${remainingDays} kun qoldi)`}
              </p>
            </div>
          </div>

          {/* 10-day expiration warning */}
          {isEndingSoon && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-start gap-2.5 text-[13px] text-amber-900 dark:text-amber-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="leading-relaxed">
                <span className="font-semibold block text-[14px]">
                  {tr(`Obunangiz tugashiga ${remainingDays} kun qoldi`, `До конца подписки ${remainingDays} дн.`, `${remainingDays} days left on your subscription`)}
                </span>
                <span className="text-[13px] opacity-90 mt-0.5 block">
                  {tr(
                    "Testlarga uzluksiz kirish uchun hamyondagi mablag' bilan muddatni hozir uzaytirishingiz mumkin.",
                    'Чтобы доступ не прерывался, продлите подписку с баланса прямо сейчас.',
                    'Renew now from your balance to keep uninterrupted access.'
                  )}
                </span>
              </div>
            </div>
          )}

          <p className="text-[13px] text-slate-600 dark:text-slate-300">{tr('Barcha testlarga cheklovsiz kirish yoqilgan.', 'Открыт неограниченный доступ ко всем тестам.', 'Unlimited access to all tests is on.')}</p>

          {/* Extend button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowExtendPlans((prev) => !prev);
            }}
            className="w-full min-h-[44px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 flex items-center justify-center gap-2 text-[14px] font-semibold text-slate-800 dark:text-slate-100"
          >
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
            <span>{showExtendPlans ? tr('Tariflarni yashirish', 'Скрыть тарифы', 'Hide plans') : tr('Obunani uzaytirish', 'Продлить подписку', 'Renew subscription')}</span>
          </button>
        </div>
      )}

      {(!isPaidUser(profile) || showExtendPlans || isEndingSoon) && (
        <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-50">
              {isPaidUser(profile) ? tr('Obunani uzaytirish', 'Продление подписки', 'Renew subscription') : tr('Obuna tariflari', 'Тарифы подписки', 'Subscription plans')}
            </h3>
          </div>
          {hasVoucher && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              {tr('-20 000 vaucher chegirmasi bilan', 'со скидкой по ваучеру -20 000', 'with -20,000 voucher discount')}
            </span>
          )}
        </div>

        {/* CARD 1: 3 Oylik (asl 35 000 -> vaucher bilan 15 000) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                {isPaidUser(profile) ? tr("+90 kun qo'shiladi", '+90 дней', '+90 days') : tr('90 kun', '90 дней', '90 days')}
              </span>
              <h4 className="font-semibold text-[16px] text-slate-900 dark:text-slate-50 mt-1">
                {tr('3 oylik Premium', 'Premium на 3 месяца', 'Premium · 3 months')}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                {tr('Oraliq va yakuniy nazoratlarga tayyorgarlik', 'Подготовка к промежуточным и итоговым контролям', 'Prep for midterm and final exams')}
              </p>
            </div>

            <div className="text-right shrink-0">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  {price3M.toLocaleString('uz-UZ')} {SOM}
                </span>
              )}
              <span className="text-[17px] font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                {cost3M.toLocaleString('uz-UZ')} {SOM}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2.5">
            {canAfford3M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('3_months')}
                className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{isPaidUser(profile) ? tr('Obunani uzaytirish', 'Продлить', 'Renew') : tr('Obunani yoqish', 'Оформить', 'Subscribe')}</span>
                <span className="text-[11px] opacity-80">({cost3M.toLocaleString('uz-UZ')} {SOM})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScrollToRequisites(deficit3M)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold text-[14px] active:bg-emerald-50 dark:active:bg-emerald-950 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{tr("Hisobni to'ldirish: yana", 'Пополнить: не хватает', 'Top up: need')} {deficit3M.toLocaleString('uz-UZ')} {SOM}</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: 6 Oylik (Tavsiya etiladi - asl 60 000 -> vaucher bilan 40 000) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-600 dark:border-emerald-400 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="inline-block text-[12px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {tr('Tavsiya etiladi', 'Рекомендуем', 'Recommended')}
              </span>
              <h4 className="font-semibold text-[16px] text-slate-900 dark:text-slate-50 mt-1">
                {tr('6 oylik Premium', 'Premium на 6 месяцев', 'Premium · 6 months')}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                {tr('Barcha fanlar va HEMIS testlari, 180 kun', 'Все предметы и тесты HEMIS, 180 дней', 'All subjects and HEMIS tests, 180 days')}
              </p>
            </div>

            <div className="text-right shrink-0">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  {price6M.toLocaleString('uz-UZ')} {SOM}
                </span>
              )}
              <span className="text-[17px] font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                {cost6M.toLocaleString('uz-UZ')} {SOM}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2.5">
            {canAfford6M ? (
              <button
                type="button"
                onClick={() => handleSubscribe('6_months')}
                className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{isPaidUser(profile) ? tr('Obunani uzaytirish', 'Продлить', 'Renew') : tr('Obunani yoqish', 'Оформить', 'Subscribe')}</span>
                <span className="text-[11px] opacity-80">({cost6M.toLocaleString('uz-UZ')} {SOM})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScrollToRequisites(deficit6M)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold text-[14px] active:bg-emerald-50 dark:active:bg-emerald-950 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{tr("Hisobni to'ldirish: yana", 'Пополнить: не хватает', 'Top up: need')} {deficit6M.toLocaleString('uz-UZ')} {SOM}</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 3: 1 Yillik (asl 100 000 -> vaucher bilan 80 000) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                {isPaidUser(profile) ? tr("+365 kun qo'shiladi", '+365 дней', '+365 days') : tr('365 kun', '365 дней', '365 days')}
              </span>
              <h4 className="font-semibold text-[16px] text-slate-900 dark:text-slate-50 mt-1">
                {tr('1 yillik Premium', 'Premium на 1 год', 'Premium · 1 year')}
              </h4>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                {tr("Butun o'quv yili uchun to'liq kirish", 'Полный доступ на весь учебный год', 'Full access for the whole academic year')}
              </p>
            </div>

            <div className="text-right shrink-0">
              {hasVoucher && (
                <span className="line-through text-xs text-slate-400 font-semibold block">
                  {price1Y.toLocaleString('uz-UZ')} {SOM}
                </span>
              )}
              <span className="text-[17px] font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                {cost1Y.toLocaleString('uz-UZ')} {SOM}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2.5">
            {canAfford1Y ? (
              <button
                type="button"
                onClick={() => handleSubscribe('1_year')}
                className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{isPaidUser(profile) ? tr('Obunani uzaytirish', 'Продлить', 'Renew') : tr('Obunani yoqish', 'Оформить', 'Subscribe')}</span>
                <span className="text-[11px] opacity-80">({cost1Y.toLocaleString('uz-UZ')} {SOM})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleScrollToRequisites(deficit1Y)}
                className="w-full min-h-[48px] px-4 rounded-xl border border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-semibold text-[14px] active:bg-emerald-50 dark:active:bg-emerald-950 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{tr("Hisobni to'ldirish: yana", 'Пополнить: не хватает', 'Top up: need')} {deficit1Y.toLocaleString('uz-UZ')} {SOM}</span>
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
                    <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-50">
            {t.walletP2PTitle}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Card Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {t.walletCardHolderLabel} <b className="text-slate-900 dark:text-white">{CARD_HOLDER}</b>
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Humo • {t.walletZeroCommission}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pl-3.5 pr-1.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="font-mono font-semibold text-[16px] min-[360px]:text-[17px] tracking-[0.02em] tabular-nums whitespace-nowrap text-slate-900 dark:text-white select-all">
                {CARD_FORMATTED}
              </span>
              <button
                type="button"
                onClick={handleCopyCard}
                aria-label={copiedCard ? t.walletCardCopied : t.walletCopyCardBtn}
                title={copiedCard ? t.walletCardCopied : t.walletCopyCardBtn}
                className="w-11 h-11 rounded-lg text-emerald-700 dark:text-emerald-300 active:bg-emerald-50 dark:active:bg-emerald-950 flex items-center justify-center transition-colors shrink-0"
              >
                {copiedCard ? (
                  <Check className="w-5 h-5" strokeWidth={2.25} />
                ) : (
                  <Copy className="w-5 h-5" strokeWidth={1.75} />
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
                      ? tr('Siqilmoqda...', 'Сжатие...', 'Compressing...')
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
              <span>{verifyStepText || tr('Chek tekshirilmoqda...', 'Проверка чека...', 'Checking receipt...')}</span>
            </div>
          )}

          {/* Action Button: "Kvitansiyani yuborish" */}
          <button
            type="button"
            onClick={handleSendReceipt}
            disabled={!selectedFile || isVerifying || isCompressing}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" strokeWidth={2} />
                <span>{tr('Tekshirilmoqda...', 'Проверка...', 'Checking...')}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="w-full max-w-md max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <History className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                    {tr('Amallar tarixi', 'История операций', 'Transaction history')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {tr("Barcha to'lovlar va mukofotlar", 'Все платежи и бонусы', 'All payments and rewards')}
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
                  <p className="font-bold">{tr("Hozircha amallar yo'q", 'Операций пока нет', 'No transactions yet')}</p>
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
                        {tr('Bu toifada amallar topilmadi', 'В этой категории операций нет', 'No transactions in this category')}
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
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {tx.date}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-block ${
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-sm w-full text-center shadow-lg space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {successPopupMessage}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {tr("To'lovingiz tasdiqlandi. Balansingiz yangilandi.", 'Платёж подтверждён. Баланс обновлён.', 'Your payment was confirmed. Balance updated.')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {tr('Joriy balans', 'Текущий баланс', 'Current balance')}: {(profile.walletBalance || 0).toLocaleString('uz-UZ')} {SOM}
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSuccessPopupMessage(null);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
            >
              {tr('Tushunarli', 'Понятно', 'Got it')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
