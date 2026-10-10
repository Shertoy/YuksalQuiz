import React, { useState } from 'react';
import { Share2, Copy, Check, Users, Coins, Sparkles, Gift } from 'lucide-react';
import { generateReferralLink, triggerTelegramNativeShare, triggerHaptic } from '../utils/telegram';
import { useQuizStore } from '../store/useQuizStore';

interface ReferralShareCardProps {
  userId?: string;
}

export const ReferralShareCard: React.FC<ReferralShareCardProps> = ({ userId }) => {
  const { profile } = useQuizStore();
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate dynamic Telegram deep-link for referral
  const inviteLink = generateReferralLink(userId || profile?.id);

  // Handle native link copy to clipboard
  const handleCopyLink = async () => {
    triggerHaptic('light');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        // Fallback for older WebViews
        const textArea = document.createElement('textarea');
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      triggerHaptic('success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerHaptic('error');
    }
  };

  // Handle native Telegram Share Sheet
  const handleNativeShare = () => {
    triggerHaptic('medium');
    const success = triggerTelegramNativeShare(inviteLink);
    if (!success) {
      setToastMessage('Havola nusxalandi, do\'stlaringizga yuboring!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Live Referral count & earnings from store
  const referralCount = profile?.referralCount || 0;
  const referralEarnings = referralCount * 1000;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 p-5 space-y-4">
      {/* Background glow ornaments */}

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <Gift className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[15px] leading-tight">
              Telegram Referal Tizimi
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Har bir taklif uchun{' '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                +1 000 so'm
              </span>
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[12px] whitespace-nowrap">
          <span>+1 000 UZS</span>
        </div>
      </div>

      {/* Toast notification banner */}
      {toastMessage && (
        <div className="px-3 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-medium text-center animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Live Stats Counters */}
      <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/60 py-3 text-center">
        <div>
          <div className="flex items-center justify-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap tabular-nums">
            <Users className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
            <span>{referralCount} ta</span>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            Taklif qilingan do'stlar soni
          </p>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-base font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap tabular-nums">
            <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.75} />
            <span className="whitespace-nowrap">{referralEarnings.toLocaleString('uz-UZ')} so'm</span>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            Referaldan ishlangan mablag'
          </p>
        </div>
      </div>

      {/* Invite Link Readonly Display with Copy Icon */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-slate-600 dark:text-slate-300 block">
          Shaxsiy taklif havolangiz:
        </label>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-1.5 pl-3 border border-slate-200 dark:border-slate-700">
          <span className="text-[13px] text-slate-700 dark:text-slate-200 truncate flex-1 select-all">
            {inviteLink}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="min-h-[36px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-semibold text-[13px] flex items-center gap-1 shrink-0"
            title="Nusxalash"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                <span className="text-emerald-700 dark:text-emerald-300">Nusxalandi</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Nusxalash</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Native Telegram Share Sheet Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
        >
          <Share2 className="w-4 h-4" strokeWidth={1.75} />
          <span>Do'stlarni taklif qilish (+1 000 so'm)</span>
        </button>
      </div>

      {/* Informative footer */}
      <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1 opacity-90">
        <Sparkles className="w-3 h-3 text-amber-600" strokeWidth={1.75} />
        <span>Do'stlaringiz ilovaga qo'shilganda hisobingizga avtomatik +1 000 so'm qo'shiladi!</span>
      </div>
    </div>
  );
};
