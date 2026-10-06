import React, { useState, useEffect } from 'react';
import { Lock, X, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { setAdminSessionAuthenticated } from '../utils/security';
import { apiPost } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Admin kirishi. Parol brauzer kodida saqlanmaydi.
 * Server Telegram imzosini tekshiradi va ID ni ADMIN_TELEGRAM_IDS bilan solishtiradi.
 */
export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    const r = await apiPost('/api/admin', { action: 'whoami' });
    setLoading(false);
    if (r.ok && r.data?.admin) {
      triggerHaptic('success');
      setAdminSessionAuthenticated(true);
      onSuccess();
      return;
    }
    triggerHaptic('error');
    if (r.status === 401) setError('Ilovani Telegram ichida oching.');
    else if (r.status === 403) setError("Bu Telegram akkauntida admin huquqi yo'q.");
    else setError(r.data?.error || 'Tekshirib bo\'lmadi. Keyinroq urinib ko\'ring.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Lock className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Admin paneliga kirish</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          Kirish Telegram akkauntingiz orqali tekshiriladi. Parol kerak emas.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />}
          <span>{loading ? 'Tekshirilmoqda...' : 'Admin sifatida kirish'}</span>
        </button>
      </div>
    </div>
  );
};
