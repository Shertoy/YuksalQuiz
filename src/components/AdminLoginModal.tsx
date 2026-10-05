import React, { useState, useEffect } from 'react';
import { Lock, X, KeyRound, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import {
  checkAdminRateLimit,
  recordAdminFailedAttempt,
  resetAdminRateLimit,
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
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockStatus, setLockStatus] = useState<{
    isLocked: boolean;
    remainingSeconds: number;
    attemptsLeft: number;
  }>({ isLocked: false, remainingSeconds: 0, attemptsLeft: 5 });

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLogin('admin');
      setPassword('');
      setLockStatus(checkAdminRateLimit());
    }
  }, [isOpen]);

  // Live countdown timer if locked out
  useEffect(() => {
    if (!lockStatus.isLocked || lockStatus.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockStatus((prev) => {
        if (prev.remainingSeconds <= 1) {
          clearInterval(timer);
          return { isLocked: false, remainingSeconds: 0, attemptsLeft: 5 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockStatus.isLocked, lockStatus.remainingSeconds]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Hacker Brute-Force Check: agar bloklangan bo'lsa kirish to'xtatiladi
    const currentRate = checkAdminRateLimit();
    if (currentRate.isLocked) {
      setLockStatus(currentRate);
      setError(`Xavfsizlik tizimi: Noto'g'ri urinishlar tufayli kirish bloklangan! ${currentRate.remainingSeconds} soniyadan so'ng urinib ko'ring.`);
      return;
    }

    const cleanLogin = login.trim().toLowerCase();
    const cleanPass = password.trim();

    // Ruxsat berilgan Login: admin (yoki admin IDlar), Parol: yuksal2026 (yoki admin123)
    const isLoginValid = cleanLogin === 'admin' || cleanLogin === '117932388' || cleanLogin === '6219808382';
    const isPassValid = cleanPass === 'yuksal2026' || cleanPass === 'admin123' || cleanPass === '117932388';

    if (isLoginValid && isPassValid) {
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
        setError(`Xavfsizlik: 5 marta noto'g'ri kiritildi! Hacker hujumidan himoya maqsadida kirish 15 daqiqaga bloklandi.`);
      } else {
        setError(`Login yoki parol noto'g'ri! Qolgan urinishlar: ${updatedRate.attemptsLeft} ta. (Login: admin, Parol: yuksal2026)`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Lock className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Admin Paneliga Kirish
              </h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" strokeWidth={1.75} />
                <span>Tezkor Admin Paroli</span>
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

        {/* Hacker Attack / Lockout Countdown Banner */}
        {lockStatus.isLocked && (
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-semibold mb-3 text-center animate-pulse">
            <div className="flex items-center justify-center gap-1.5 font-black">
              <Clock className="w-4 h-4" strokeWidth={1.75} />
              <span>Bloklangan: {Math.floor(lockStatus.remainingSeconds / 60)}m {lockStatus.remainingSeconds % 60}s</span>
            </div>
            <p className="text-[11px] mt-0.5 opacity-90">
              Ketma-ket xato urinishlar aniqlandi. Tizim xavfsizlik himoyasida.
            </p>
          </div>
        )}

        {error && !lockStatus.isLocked && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-semibold mb-3 flex items-center gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admin Login:
            </label>
            <input
              type="text"
              required
              disabled={lockStatus.isLocked}
              value={login}
              onChange={(e) => {
                setLogin(e.target.value);
                setError('');
              }}
              placeholder="Masalan: admin"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admin Paroli:
            </label>
            <input
              type="password"
              required
              disabled={lockStatus.isLocked}
              autoFocus={!lockStatus.isLocked}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Masalan: yuksal2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Kirish</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
