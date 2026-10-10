import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { useTranslation, trNow } from '../i18n/useTranslation';

export const OfflineStatusBanner: React.FC = () => {
  const { tr } = useTranslation();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowDetailsModal(false);
      setToastMessage(trNow('Internet aloqasi qayta tiklandi', 'Подключение восстановлено', 'Connection restored'));
      setShowToast(true);
      triggerHaptic('success');

      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage(trNow('Internet aloqasi uzildi. Oflayn rejim yoqildi.', 'Нет подключения. Включён офлайн-режим.', 'Connection lost. Offline mode is on.'));
      setShowToast(true);
      triggerHaptic('warning');

      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    triggerHaptic('light');

    try {
      // Fast cache-busted ping to check internet
      await fetch('/favicon.svg?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      setIsOnline(true);
      setShowDetailsModal(false);
      setToastMessage(tr('Internet aloqasi bor', 'Подключение есть', 'You are online'));
      setShowToast(true);
      triggerHaptic('success');
      setTimeout(() => setShowToast(false), 3000);
    } catch {
      setIsOnline(false);
      triggerHaptic('error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      {/* Floating Offline Notification Strip */}
      {!isOnline && (
        <div
          onClick={() => {
            triggerHaptic('light');
            setShowDetailsModal(true);
          }}
          className="sticky top-0 z-50 bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md text-amber-950 dark:text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between shadow-md cursor-pointer transition-all animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold tracking-wide">
              {tr("Internet yo'q — oflayn rejim", 'Нет интернета — офлайн-режим', 'No internet — offline mode')}
            </span>
          </div>

          <span className="text-[11px] bg-black/15 dark:bg-white/20 px-2 py-0.5 rounded-full font-bold">
            {tr('Batafsil', 'Подробнее', 'Details')} &rarr;
          </span>
        </div>
      )}

      {/* Online Reconnected Floating Toast */}
      {showToast && isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-2xl shadow-md flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300">
          <Wifi className="w-4 h-4 text-emerald-200" strokeWidth={1.75} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline Details Modal */}
      {showDetailsModal && !isOnline && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-lg relative">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 mx-auto">
              <WifiOff className="w-7 h-7" strokeWidth={1.75} />
            </div>

            <h3 className="text-center font-bold text-base text-slate-900 dark:text-white mb-1.5">
              {tr("Internet aloqasi yo'q", 'Нет подключения к интернету', 'No internet connection')}
            </h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              {tr("Qurilmangiz hozirda internet tarmog'iga ulanmagan. YuksalQuiz ilovasi sizning test natijalaringiz va shaxsiy ma'lumotlaringizni xavfsiz holatda saqlab turadi.", 'Устройство сейчас не подключено к интернету. YuksalQuiz сохраняет ваши результаты и данные на устройстве.', 'Your device is offline. YuksalQuiz keeps your results and data safe on the device.')}
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 text-left mb-4 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={1.75} />
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-bold block">{tr("Ma'lumotlar yo'qolmaydi", 'Данные не потеряются', 'Your data is safe')}</span>
                {tr('Barcha natijalar qurilma xotirasida saqlanmoqda.', 'Все результаты сохраняются в памяти устройства.', 'All results are saved on this device.')}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                <span>{isChecking ? tr('Tekshirilmoqda...', 'Проверка...', 'Checking...') : tr('Aloqani qayta tekshirish', 'Проверить снова', 'Check again')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                {tr('Oflayn rejimda davom etish', 'Продолжить офлайн', 'Continue offline')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
