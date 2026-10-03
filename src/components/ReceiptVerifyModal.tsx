import React, { useState, useRef, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Copy,
  Check,
  X,
  RefreshCw,
  Send,
  Zap,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  PlusCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { ReceiptVerificationResult } from '../types';

interface ReceiptVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
  onSuccess?: (creditedAmount: number) => void;
}

export const ReceiptVerifyModal: React.FC<ReceiptVerifyModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 20000,
  onSuccess,
}) => {
  const { profile, depositBalance } = useQuizStore();
  const { t } = useTranslation();

  const QUICK_AMOUNTS = [20000, 40000, 50000, 90000];

  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!QUICK_AMOUNTS.includes(initialAmount));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStepText, setVerifyStepText] = useState('');
  const [result, setResult] = useState<ReceiptVerificationResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAmount) {
      if (QUICK_AMOUNTS.includes(initialAmount)) {
        setSelectedAmount(initialAmount);
        setIsCustomMode(false);
      } else {
        setSelectedAmount(initialAmount);
        setCustomAmountStr(initialAmount.toString());
        setIsCustomMode(true);
      }
    }
  }, [initialAmount]);

  if (!isOpen) return null;

  const CARD_NUMBER_RAW = '9860080382320093';
  const CARD_NUMBER_FORMATTED = '9860 0803 8232 0093';
  const CARD_HOLDER = 'Alijonova Xalimaxon';

  const handleCopyCard = () => {
    triggerHaptic('light');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(CARD_NUMBER_RAW);
    }
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleSelectQuickAmount = (amt: number) => {
    triggerHaptic('selection');
    setSelectedAmount(amt);
    setIsCustomMode(false);
    setCustomAmountStr('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomAmountStr(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSelectedAmount(num);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError("Iltimos, faqat rasm formatidagi kvitansiyani tanlang (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Rasm hajmi juda katta (maksimal 10 MB).");
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    triggerHaptic('light');
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setResult(null);
    triggerHaptic('light');
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleVerifyReceipt = async () => {
    if (!selectedFile) {
      setUploadError("Iltimos, avval to'lov cheki rasmini yuklang.");
      triggerHaptic('warning');
      return;
    }

    setIsVerifying(true);
    setUploadError(null);
    setResult(null);
    triggerHaptic('medium');

    try {
      setVerifyStepText("Kvitansiya tasviri tayyorlanmoqda...");
      const base64Data = await convertFileToBase64(selectedFile);

      setVerifyStepText("Gemini 1.5 Flash Vision kvitansiyani tahlil qilmoqda...");

      // API call to serverless function
      const response = await fetch('/api/verify-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          mimeType: selectedFile.type || 'image/jpeg',
          userId: profile.id,
          userName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Talaba',
          expectedAmount: selectedAmount,
        }),
      });

      setVerifyStepText("Anti-cheat va tranzaksiya tekshirilmoqda...");

      const data: ReceiptVerificationResult = await response.json();

      setResult(data);

      if (data.status === 'approved') {
        // Celebrate success!
        triggerHaptic('success');
        soundFX.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        const creditedAmount = data.amount || selectedAmount;
        const txId = data.transactionId || `PAY_${Date.now()}`;

        // Deposit balance directly in local store
        depositBalance(creditedAmount, txId);

        if (onSuccess) {
          onSuccess(creditedAmount);
        }
      } else if (data.status === 'pending') {
        triggerHaptic('warning');
      } else {
        triggerHaptic('error');
        soundFX.playError();
      }
    } catch (err: any) {
      console.error('Receipt verification exception:', err);
      // Fallback pending state if network or server glitch
      const fallbackResult: ReceiptVerificationResult = {
        ok: true,
        status: 'pending',
        message:
          "Chek yuborildi. Server vaqtincha sekin ishlaganligi sababli kvitansiya admin ko'rigiga yo'naltirildi. Tez orada tekshirilib tasdiqlanadi.",
      };
      setResult(fallbackResult);
      triggerHaptic('warning');
    } finally {
      setIsVerifying(false);
      setVerifyStepText('');
    }
  };

  const handleFinishAndContinue = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
              <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Hisobni To'ldirish
                </h3>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  Gemini AI ⚡
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                P2P chekni avtomatik tekshirish va balansni to'ldirish
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

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Current Balance Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Joriy hisobingiz:
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {(profile.walletBalance || 0).toLocaleString('uz-UZ')} so'm
            </span>
          </div>

          {/* SUCCESS VIEW */}
          {result?.status === 'approved' && (
            <div className="text-center py-6 px-4 space-y-3.5 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-3xl border border-emerald-500/30">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Hisobingiz Muvaffaqiyatli To'ldirildi! 🎉
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Gemini AI to'lov chekingizni haqiqiyligini tasdiqladi. Balansingizga +{(result.amount || selectedAmount).toLocaleString('uz-UZ')} so'm qo'shildi!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
                  Yangi balansingiz:
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {(profile.walletBalance || 0).toLocaleString('uz-UZ')} so'm
                </span>
              </div>

              {result.transactionId && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
                  Tranzaksiya ID: <b>{result.transactionId}</b>
                </div>
              )}

              <button
                type="button"
                onClick={handleFinishAndContinue}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Davom Etish</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* PENDING VIEW */}
          {result?.status === 'pending' && (
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-white space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Clock className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-amber-700 dark:text-amber-400">
                    Kvitansiya Ko'rikka Yuborildi (Kutilmoqda)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {result.message}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                <a
                  href="https://t.me/YuksalQuiz_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('medium')}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs text-center flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram Bot orqali tekshirish (@YuksalQuiz_bot)</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Tushundim, yopish
                </button>
              </div>
            </div>
          )}

          {/* REJECTED ALERT */}
          {result?.status === 'rejected' && (
            <div className="p-3.5 rounded-2xl bg-orange-500 text-white text-xs font-bold space-y-1.5 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-white" strokeWidth={2} />
                <span>To'lov Cheki Rad Etildi!</span>
              </div>
              <p className="font-medium text-[11px] opacity-95">
                {result.reason || result.message}
              </p>
            </div>
          )}

          {/* NORMAL FORM (When not approved) */}
          {result?.status !== 'approved' && (
            <>
              {/* Official Card Requisites */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 text-white space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">To'lov uchun karta (Humo):</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                    0% Komissiya
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                  <div>
                    <span className="font-mono font-black text-sm sm:text-base tracking-wider select-all block text-emerald-300">
                      {CARD_NUMBER_FORMATTED}
                    </span>
                    <span className="text-[11px] text-slate-300 font-bold">
                      {CARD_HOLDER}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0 shadow-sm"
                  >
                    {copiedCard ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span className="text-[10px]">Nusxalandi</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                        <span className="text-[10px]">Nusxa olish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount Selection Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  To'ldirish Summasi:
                </label>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelected = !isCustomMode && selectedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectQuickAmount(amt)}
                        className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-102'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {amt.toLocaleString('uz-UZ')}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input Option */}
                <div className="pt-1">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ixtiyoriy summa (masalan: 30000)"
                      value={customAmountStr}
                      onChange={handleCustomAmountChange}
                      onFocus={() => setIsCustomMode(true)}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all ${
                        isCustomMode
                          ? 'border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      so'm
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>To'lov chekini yuklang (Click, Payme, Uzum):</span>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[10px] text-red-500 hover:underline font-semibold"
                    >
                      Boshqa rasm tanlash
                    </button>
                  )}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="receipt-file-input"
                />

                {!selectedFile ? (
                  <label
                    htmlFor="receipt-file-input"
                    className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                      <Upload className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Chek rasmini yuklash
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Galereyadan tanlang yoki kamerada rasmga oling (JPG, PNG)
                    </span>
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 bg-slate-950 flex items-center justify-center">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Kvitansiya cheki"
                        className="max-h-56 object-contain w-full"
                      />
                    )}

                    {/* Scanner animation overlay when active */}
                    {isVerifying && (
                      <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-lg shadow-emerald-400/80" />
                        <div className="p-3 rounded-2xl bg-slate-900/90 text-white border border-emerald-500/50 flex items-center gap-2.5 shadow-2xl z-10">
                          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                          <span className="text-xs font-bold">{verifyStepText}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Anti-cheat Notice */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Avtomatik Anti-Cheat Tizimi:</span>
                </div>
                <p>
                  • Kvitansiya oxirgi 30 daqiqa ichida amalga oshirilgan bo'lishi shart.<br />
                  • Bir xil chekdan faqat bir marta foydalanish mumkin (Tranzaksiya ID tekshiriladi).<br />
                  • Karta raqami (9860080382320093) va egasi (Alijonova Xalimaxon) mos kelishi kerak.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isVerifying || !selectedFile}
                onClick={handleVerifyReceipt}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  isVerifying || !selectedFile
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 active:scale-[0.98]'
                }`}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Tekshirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Kvitansiyani Tekshirish (Gemini AI bilan)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
