import React, { useState, useEffect } from 'react';
import { Lock, X, KeyRound, ShieldAlert, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import {
  checkAdminRateLimit,
  recordAdminFailedAttempt,
  resetAdminRateLimit,
  sanitizeText,
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockStatus, setLockStatus] = useState<{
    isLocked: boolean;
    remainingSeconds: number;
    attemptsLeft: number;
  }>({ isLocked: false, remainingSeconds: 0, attemptsLeft: 4 });

  useEffect(() => {
    if (isOpen) {
      const status = checkAdminRateLimit();
      setLockStatus(status);
    }
  }, [isOpen]);

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

    const u = sanitizeText(username.trim().toLowerCase());
    const p = password.trim();

    // Secure credentials verification
    if (u === 'admin' && (p === 'yuksal2026' || p === 'admin123')) {
      triggerHaptic('success');
      resetAdminRateLimit();
      setError('');
      setUsername('');
      setPassword('');
      onSuccess();
    } else {
      triggerHaptic('error');
      const updatedRate = recordAdminFailedAttempt();
      setLockStatus(updatedRate);

      if (updatedRate.isLocked) {
        setError(`Xavfsizlik tizimi: Noto'g'ri urinishlar soni oshib ketdi! Kirish 15 daqiqaga bloklandi.`);
      } else {
        setError(`Login yoki parol noto'g'ri! Qolgan urinishlar: ${updatedRate.attemptsLeft} ta.`);
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Admin Tizimiga Kirish
              </h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Brute-force himoyasi faol</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lockout Warning */}
        {lockStatus.isLocked && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-4 space-y-1 text-center animate-pulse">
            <div className="flex items-center justify-center gap-1.5 font-black text-rose-600 dark:text-rose-300">
              <Clock className="w-4 h-4" />
              <span>Bloklangan: {formatTime(lockStatus.remainingSeconds)}</span>
            </div>
            <p className="text-[11px] opacity-90">
              Xavfsizlik yuzasidan tizimga kirish vaqtincha to'xtatildi.
            </p>
          </div>
        )}

        {error && !lockStatus.isLocked && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admin Login:
            </label>
            <input
              type="text"
              required
              disabled={lockStatus.isLocked}
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Masalan: admin"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Parol:
            </label>
            <input
              type="password"
              required
              disabled={lockStatus.isLocked}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Parolni kiriting..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Kirish</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
