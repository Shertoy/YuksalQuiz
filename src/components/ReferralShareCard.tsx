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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/80 border border-emerald-500/25 text-white p-5 shadow-xl shadow-emerald-950/40 space-y-4">
      {/* Background glow ornaments */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-orange-400/10 blur-xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Gift className="w-5 h-5 text-emerald-400" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-sm tracking-tight leading-tight">
              Telegram Referal Tizimi
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Har bir taklif uchun{' '}
              <span className="font-extrabold text-orange-400 whitespace-nowrap">
                +1 000 so'm
              </span>
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center px-2 py-0.5 rounded-full bg-orange-500 text-white font-black text-[10px] uppercase tracking-wide whitespace-nowrap shadow-sm">
          <span>+1 000 UZS</span>
        </div>
      </div>

      {/* Toast notification banner */}
      {toastMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center shadow-lg animate-in fade-in zoom-in-95">
          {toastMessage}
        </div>
      )}

      {/* Live Stats Counters */}
      <div className="grid grid-cols-2 gap-2.5 bg-black/30 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
        <div>
          <div className="flex items-center justify-center gap-1.5 text-base font-black text-white whitespace-nowrap">
            <Users className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span>{referralCount} ta</span>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
            Taklif qilingan do'stlar soni
          </p>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-base font-black text-amber-400 whitespace-nowrap">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.75} />
            <span className="whitespace-nowrap">{referralEarnings.toLocaleString('uz-UZ')} so'm</span>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
            Referaldan ishlangan mablag'
          </p>
        </div>
      </div>

      {/* Invite Link Readonly Display with Copy Icon */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300 block">
          Shaxsiy taklif havolangiz:
        </label>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 pl-3 border border-white/15">
          <span className="text-xs font-mono text-white/90 truncate flex-1 select-all">
            {inviteLink}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 flex items-center gap-1 transition-all active:scale-95 shadow shrink-0"
            title="Nusxalash"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                <span className="text-emerald-700">Nusxalandi!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-700" strokeWidth={1.75} />
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
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4 text-white" strokeWidth={1.75} />
          <span>Do'stlarni taklif qilish (+1 000 so'm)</span>
        </button>
      </div>

      {/* Informative footer */}
      <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 opacity-90">
        <Sparkles className="w-3 h-3 text-orange-400" strokeWidth={1.75} />
        <span>Do'stlaringiz ilovaga qo'shilganda hisobingizga avtomatik +1 000 so'm qo'shiladi!</span>
      </div>
    </div>
  );
};
