import React, { useState, useEffect } from 'react';
import { Lock, X, KeyRound, ShieldAlert, ShieldCheck, Clock, UserX, ShieldBan } from 'lucide-react';
import { triggerHaptic, getTelegramWebApp } from '../utils/telegram';
import { useQuizStore } from '../store/useQuizStore';
import {
  checkAdminRateLimit,
  recordAdminFailedAttempt,
  resetAdminRateLimit,
  sanitizeText,
  isTelegramIdAuthorizedAdmin,
  cleanTelegramId,
  setAdminSessionAuthenticated,
} from '../utils/security';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const profile = useQuizStore((state) => state.profile);
  const [telegramIdInput, setTelegramIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockStatus, setLockStatus] = useState<{
    isLocked: boolean;
    remainingSeconds: number;
    attemptsLeft: number;
  }>({ isLocked: false, remainingSeconds: 0, attemptsLeft: 4 });

  // Detect Telegram environment & user ID
  const tg = getTelegramWebApp();
  const tgUser = tg?.initDataUnsafe?.user;
  const currentTgId = tgUser?.id
    ? String(tgUser.id)
    : profile?.id?.startsWith('tg_')
    ? profile.id.replace('tg_', '')
    : '';

  const isTgEnv = Boolean(tgUser?.id || (tg && tg.initData));
  const isDirectAuthorized = currentTgId ? isTelegramIdAuthorizedAdmin(currentTgId) : false;

  useEffect(() => {
    if (isOpen) {
      const status = checkAdminRateLimit();
      setLockStatus(status);
      setError('');
      setPassword('');
      if (currentTgId && !isTgEnv) {
        setTelegramIdInput(currentTgId);
      }
    }
  }, [isOpen, currentTgId, isTgEnv]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockStatus.isLocked || lockStatus.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockStatus((prev) => {
        if (prev.remainingSeconds <= 1) {
          clearInterval(timer);
          return { isLocked: false, remainingSeconds: 0, attemptsLeft: 4 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockStatus.isLocked, lockStatus.remainingSeconds]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit status first
    const currentRate = checkAdminRateLimit();
    if (currentRate.isLocked) {
      setLockStatus(currentRate);
      setError(`Tizim vaqtincha bloklangan! ${Math.ceil(currentRate.remainingSeconds / 60)} daqiqadan so'ng urinib ko'ring.`);
      return;
    }

    // Determine target Telegram ID to verify
    const effectiveTgId = isTgEnv && currentTgId ? currentTgId : cleanTelegramId(telegramIdInput.trim());

    if (!effectiveTgId) {
      setError("Admin Telegram ID kiritilishi shart!");
      triggerHaptic('error');
      return;
    }

    // 1. Strict Telegram ID Whitelist check
    if (!isTelegramIdAuthorizedAdmin(effectiveTgId)) {
      triggerHaptic('error');
      const updatedRate = recordAdminFailedAttempt();
      setLockStatus(updatedRate);
      setError(`Ruxsat etilmagan Telegram ID (${effectiveTgId})! Adminlar ro'yxatida yo'q.`);
      return;
    }

    // 2. Admin Passcode verification
    const p = password.trim();
    if (p === 'yuksal2026' || p === 'admin123') {
      triggerHaptic('success');
      resetAdminRateLimit();
      setAdminSessionAuthenticated(true);
      setError('');
      setPassword('');
      onSuccess();
    } else {
      triggerHaptic('error');
      const updatedRate = recordAdminFailedAttempt();
      setLockStatus(updatedRate);

      if (updatedRate.isLocked) {
        setError(`Xavfsizlik tizimi: Noto'g'ri urinishlar soni oshib ketdi! Kirish 15 daqiqaga bloklandi.`);
      } else {
        setError(`Admin paroli noto'g'ri! Qolgan urinishlar: ${updatedRate.attemptsLeft} ta.`);
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
              isTgEnv && !isDirectAuthorized
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isTgEnv && !isDirectAuthorized ? (
                <ShieldBan className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Lock className="w-5 h-5" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Admin Paneliga Kirish
              </h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" strokeWidth={1.75} />
                <span>Telegram ID Xavfsizlik Filtri</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* CASE 1: Telegram WebApp Detected & User NOT Whitelisted -> HARD BLOCK */}
        {isTgEnv && !isDirectAuthorized ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                <UserX className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>Kirish Taqiqlangan!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Sizning Telegram ID'ingiz: <b className="font-mono text-rose-600 dark:text-rose-400">{currentTgId}</b> ({tgUser?.first_name || profile?.firstName || 'Foydalanuvchi'}).
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Ushbu hisob tasdiqlangan adminlar ro'yxatida mavjud emas. Admin panel faqat belgilangan Telegram ID'ga ega adminlar uchun ochiladi.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Yopish
            </button>
          </div>
        ) : (
          /* CASE 2: Authorized Telegram User OR Web Browser Admin Login */
          <>
            {/* Lockout Warning */}
            {lockStatus.isLocked && (
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-semibold mb-4 space-y-1 text-center animate-pulse">
                <div className="flex items-center justify-center gap-1.5 font-black text-orange-600 dark:text-orange-300">
                  <Clock className="w-4 h-4" strokeWidth={1.75} />
                  <span>Bloklangan: {formatTime(lockStatus.remainingSeconds)}</span>
                </div>
                <p className="text-[11px] opacity-90">
                  Xavfsizlik yuzasidan tizimga kirish vaqtincha to'xtatildi.
                </p>
              </div>
            )}

            {error && !lockStatus.isLocked && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-semibold mb-3 flex items-center gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            )}

            {/* Telegram User Verification Badge */}
            {isTgEnv && isDirectAuthorized && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.75} />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold">Tasdiqlangan Admin:</span> {tgUser?.first_name || 'Admin'} (ID: <code className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded">{currentTgId}</code>)
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* If NOT in Telegram, ask for Admin Telegram ID */}
              {(!isTgEnv || !currentTgId) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Telegram ID:
                  </label>
                  <input
                    type="text"
                    required
                    disabled={lockStatus.isLocked}
                    autoFocus
                    value={telegramIdInput}
                    onChange={(e) => {
                      setTelegramIdInput(e.target.value);
                      setError('');
                    }}
                    placeholder="Masalan: 6219808382"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Faqat ruxsat berilgan Telegram ID adminlar tizimga kira oladi.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Paroli:
                </label>
                <input
                  type="password"
                  required
                  disabled={lockStatus.isLocked}
                  autoFocus={Boolean(isTgEnv && isDirectAuthorized)}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Parolni kiriting..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={lockStatus.isLocked}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                >
                  <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Kirish</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
