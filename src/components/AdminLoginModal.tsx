import React, { useState, useEffect } from 'react';
import {
  Lock,
  X,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Send,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { useQuizStore } from '../store/useQuizStore';
import {
  setAdminSessionAuthenticated,
  checkAdminRateLimit,
  recordAdminFailedAttempt,
  resetAdminRateLimit,
  storeAdminBrowserKey,
  clearAdminSession,
} from '../utils/security';
import { apiPost } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Zamonaviy va universal Admin Kirish Modali.
 * - Brauzer orqali: serverdagi ADMIN_SECRET_KEY bilan kirish (Telegram ID parol emas)
 * - Telegram orqali: 1-klikli avtomatik tekshiruv
 * - "Eslab qolish" imkoniyati brauzerda qayta-qayta parol so'ramasligi uchun
 * - Brute-force himoyasi (Rate Limiting)
 */
export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { theme, setTheme } = useQuizStore();
  const isInsideTelegram = typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp?.initData);

  const [activeMode, setActiveMode] = useState<'browser' | 'telegram'>(
    isInsideTelegram ? 'telegram' : 'browser'
  );
  const [credentials, setCredentials] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(4);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setLoading(false);
      const rl = checkAdminRateLimit();
      setAttemptsLeft(rl.attemptsLeft);
      if (rl.isLocked) {
        setError(`Xavfsizlik blokirovkasi: Iltimos, ${Math.ceil(rl.remainingSeconds / 60)} daqiqadan so'ng qayta urining.`);
      }

      setCredentials('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Brauzer orqali maxfiy kalit bilan kirish
  const handleBrowserLogin = async (eOrVal?: React.FormEvent | string) => {
    let targetInput = credentials;
    if (typeof eOrVal === 'string') {
      targetInput = eOrVal;
      setCredentials(eOrVal);
    } else if (eOrVal && typeof (eOrVal as any).preventDefault === 'function') {
      (eOrVal as any).preventDefault();
    }
    if (loading) return;

    // Rate limit tekshiruvi
    const rateStatus = checkAdminRateLimit();
    if (rateStatus.isLocked) {
      triggerHaptic('error');
      setError(`Ko'p noto'g'ri urinish tufayli bloklandi. ${Math.ceil(rateStatus.remainingSeconds / 60)} daqiqa kuting.`);
      return;
    }

    const trimmed = (targetInput || credentials || '').trim();
    if (!trimmed) {
      triggerHaptic('warning');
      setError("Iltimos, admin maxfiy kalitini kiriting.");
      return;
    }

    setLoading(true);
    setError('');

    // Kalit faqat serverda tekshiriladi (frontendda hech qanday parol saqlanmaydi)
    try {
      // Eski versiyadan qolgan kalitlarni tozalab, faqat hozir yozilgan kalit yuboriladi
      clearAdminSession();
      storeAdminBrowserKey(trimmed, false);
      const r = await apiPost('/api/admin', { action: 'whoami' });

      if (r.ok && r.data?.admin) {
        resetAdminRateLimit();
        triggerHaptic('success');
        setSuccessMsg("Server orqali tasdiqlandi! Admin panel ochilmoqda...");
        if (rememberMe) storeAdminBrowserKey(trimmed, true);
        setAdminSessionAuthenticated(true, rememberMe, r.data?.id || null);

        setTimeout(() => {
          setLoading(false);
          onSuccess();
        }, 250);
        return;
      }

      clearAdminSession();
      const record = recordAdminFailedAttempt();
      setAttemptsLeft(record.attemptsLeft);
      triggerHaptic('error');
      if (record.isLocked) {
        setError(`Urinishlar soni tugadi. ${Math.ceil(record.remainingSeconds / 60)} daqiqaga bloklandi.`);
      } else {
        setError(`Noto'g'ri maxfiy kalit. Qolgan urinishlar: ${record.attemptsLeft} ta.`);
      }
    } catch {
      clearAdminSession();
      const record = recordAdminFailedAttempt();
      setAttemptsLeft(record.attemptsLeft);
      triggerHaptic('error');
      setError("Noto'g'ri maxfiy kalit.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Telegram WebApp orqali 1-klikli kirish
  const handleTelegramVerify = async () => {
    setLoading(true);
    setError('');
    const r = await apiPost('/api/admin', { action: 'whoami' });
    setLoading(false);
    if (r.ok && r.data?.admin) {
      triggerHaptic('success');
      setAdminSessionAuthenticated(true, true, r.data?.id || null);
      onSuccess();
      return;
    }
    triggerHaptic('error');
    if (r.status === 401) {
      setError("Ilova Telegram ichida ochilmagan. Yuqoridan 'Brauzer orqali kirish' bo'limini tanlang.");
      setActiveMode('browser');
    } else if (r.status === 403) {
      setError("Ushbu Telegram akkauntiga admin huquqi berilmagan. Brauzer orqali maxfiy kalit bilan kiring.");
    } else {
      setError(r.data?.error || "Tekshirib bo'lmadi. Brauzer rejimidan foydalaning.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Lock className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Admin Portal</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  YuksalQuiz
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tizim va testlarni to'liq boshqarish
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTheme(theme === 'dark' ? 'light' : 'dark');
              }}
              title={theme === 'dark' ? "Yorug' rejim" : "Qorong'i rejim"}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Brauzer vs Telegram */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveMode('browser');
              setError('');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'browser'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Brauzer orqali</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveMode('telegram');
              setError('');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'telegram'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram orqali</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Body */}
        {activeMode === 'browser' ? (
          <form onSubmit={handleBrowserLogin} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Admin maxfiy kaliti</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Kalit kerakmi?</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  placeholder="Maxfiy kalit..."
                  autoFocus
                  disabled={loading}
                  className="w-full px-3.5 py-3 pr-10 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            {/* Hint Box */}
            {showHint && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1 animate-in fade-in">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Admin kirish ma'lumotlari:</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kalit Vercel'dagi ADMIN_SECRET_KEY qiymati. Telegram ichida bo'lsangiz, Telegram orqali kirish tugmasidan foydalaning.
                </p>
              </div>
            )}

            {/* Remember Me Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
              <span>Ushbu brauzerda eslab qolish (keyingi safar so'ramaydi)</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" strokeWidth={2} />
              )}
              <span>{loading ? 'Tekshirilmoqda...' : 'Admin Panelga Kirish'}</span>
            </button>
          </form>
        ) : (
          /* Telegram Verification Mode */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="mb-2">
                Telegram WebApp orqali kirganingizda tizim sizning Telegram profilingizni avtomatik tekshiradi.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Agar brauzerda (Chrome, Safari, Edge) ochgan bo'lsangiz, yuqoridagi <strong>"Brauzer orqali"</strong> bo'limiga o'ting.
              </p>
            </div>

            <button
              onClick={handleTelegramVerify}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" strokeWidth={2} />
              )}
              <span>{loading ? 'Tekshirilmoqda...' : 'Telegram bilan tekshirish'}</span>
            </button>
          </div>
        )}

        {/* Security Footer Note */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>256-bit shifrlangan xavfsiz boshqaruv markazi</span>
          </p>
        </div>
      </div>
    </div>
  );
};
