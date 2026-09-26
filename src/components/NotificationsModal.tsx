import React from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { Bell, X, Sparkles, AlertCircle, Info, Calendar } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { announcements } = useQuizStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Bildirishnomalar</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {announcements.length} ta
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Yangiliklar, tanlovlar va muhim eslatmalar
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Announcements List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(!announcements || announcements.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-bold">Hozircha bildirishnomalar yo'q</p>
              <p className="text-[11px] mt-0.5 text-slate-400">
                Yangi xabar yoki yangiliklar shu yerda aks etadi.
              </p>
            </div>
          ) : (
            announcements.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 transition-all hover:border-indigo-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase ${
                        item.tag === 'muhim'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                          : item.tag === 'eslatma'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {item.tag || 'yangilik'}
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {item.title}
                    </h4>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 shrink-0">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{item.date}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
