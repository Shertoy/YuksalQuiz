import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  Share2,
  Copy,
  Check,
  Users,
  Coins,
  Sparkles,
  ExternalLink,
  Gift,
} from 'lucide-react';
import {
  generateReferralLink,
  getTelegramUserId,
  triggerTelegramNativeShare,
  REFERRAL_SHARE_TEXT,
  triggerHaptic,
  soundFX,
} from '../utils/telegram';

export const ReferralShareCard: React.FC = () => {
  const { profile, addReferralBonus } = useQuizStore();
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Generate referral link with Telegram User ID or fallback mock guest_12345
  const telegramUserId = getTelegramUserId();
  const inviteLink = generateReferralLink(telegramUserId);

  // 2. Trigger native Telegram share sheet
  const handleNativeShare = () => {
    triggerHaptic('medium');
    soundFX.playClick();

    // Trigger Telegram deep-link via openTelegramLink
    triggerTelegramNativeShare(inviteLink, REFERRAL_SHARE_TEXT);

    // Simulate referral reward during demo/testing
    const { bonusAdded, newTotal } = addReferralBonus();
    setToastMessage(`Do'stingizga yuborildi! +${bonusAdded.toLocaleString('uz-UZ')} so'm hamyoningizga qo'shildi.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 3. Secondary copy link button
  const handleCopyLink = () => {
    triggerHaptic('light');
    soundFX.playClick();

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setToastMessage('Havola nusxalandi!');
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 2500);
    }
  };

  const referralCount = profile.referralCount || 0;
  const referralEarnings = referralCount * 1500;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-5 shadow-xl shadow-indigo-600/25 space-y-4">
      {/* Background glow ornaments */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
            <Gift className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight leading-tight">
              Telegram Referal Tizimi
            </h3>
            <p className="text-[11px] text-indigo-100">
              Har bir taklif qilingan talaba uchun +1 500 so'm
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 uppercase tracking-wider">
          +1 500 UZS
        </span>
      </div>

      {/* Toast notification banner */}
      {toastMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold text-center shadow-lg animate-in fade-in zoom-in-95">
          {toastMessage}
        </div>
      )}

      {/* Live Stats Counters */}
      <div className="grid grid-cols-2 gap-2.5 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
        <div>
          <div className="flex items-center justify-center gap-1.5 text-base font-black text-white">
            <Users className="w-4 h-4 text-sky-300" />
            <span>{referralCount} ta</span>
          </div>
          <p className="text-[10px] text-indigo-200 uppercase font-semibold tracking-wider mt-0.5">
            Taklif qilingan do'stlar soni
          </p>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 text-base font-black text-amber-300">
            <Coins className="w-4 h-4 fill-amber-300" />
            <span>{referralEarnings.toLocaleString('uz-UZ')} so'm</span>
          </div>
          <p className="text-[10px] text-indigo-200 uppercase font-semibold tracking-wider mt-0.5">
            Referaldan ishlangan mablag'
          </p>
        </div>
      </div>

      {/* Invite Link Readonly Display with Copy Icon */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-indigo-200 block">
          Shaxsiy taklif havolangiz:
        </label>
        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-2xl p-1.5 pl-3 border border-white/20">
          <span className="text-xs font-mono text-white/90 truncate flex-1 select-all">
            {inviteLink}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-slate-100 flex items-center gap-1 transition-all active:scale-95 shadow shrink-0"
            title="Nusxalash"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-700">Nusxalandi!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
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
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
        >
          <Share2 className="w-4 h-4 fill-slate-950" />
          <span>Do'stlarni taklif qilish (+1 500 so'm)</span>
        </button>
      </div>

      {/* Informative footer */}
      <div className="text-[10px] text-indigo-200 text-center flex items-center justify-center gap-1 opacity-90">
        <Sparkles className="w-3 h-3 text-amber-300" />
        <span>Telegram orqali do'stingiz ilovaga kirganda 35 000 so'm vaucher oladi!</span>
      </div>
    </div>
  );
};
