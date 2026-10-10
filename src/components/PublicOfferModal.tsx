import React from 'react';
import { X, ShieldCheck, ScrollText } from 'lucide-react';
import { OFERTA_TITLE, OFERTA_SECTIONS } from '../data/oferta';

interface PublicOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const PublicOfferModal: React.FC<PublicOfferModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-5 my-6 flex flex-col max-h-[85vh] supports-[height:100dvh]:max-h-[85dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ScrollText className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Ommaviy Oferta
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Foydalanuvchi rasmiy shartnomasi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs pr-1 flex-1 leading-relaxed text-slate-700 dark:text-slate-300">
          <div className="text-center pb-2">
            <h3 className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
              {OFERTA_TITLE}
            </h3>
          </div>

          {OFERTA_SECTIONS.map((sec, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                {sec.title}
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {sec.items.map((item, i) => (
                  <p key={i} className="text-slate-600 dark:text-slate-300">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.75} />
            <p>
              "YuksalQuiz" platformasida ro'yxatdan o'tish orqali foydalanuvchi yuqoridagi barcha qoidalarni to'liq va so'zsiz qabul qilgan hisoblanadi.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-2">
          {onAccept ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Yopish
              </button>
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                Roziman va qabul qilaman
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            >
              Tushundim
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
