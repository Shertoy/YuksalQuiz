import React from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CardNumberRowProps {
  number: string;
  holder?: string;
  copied: boolean;
  onCopy: () => void;
}

/**
 * Karta raqami + egasi + nusxalash tugmasi.
 * Raqam hech qachon kesilmaydi va qatorga bo'linmaydi; tugma faqat belgi (44×44),
 * shuning uchun 320px ekranda ham chegaradan chiqmaydi.
 */
export const CardNumberRow: React.FC<CardNumberRowProps> = ({ number, holder, copied, onCopy }) => {
  const { tr } = useTranslation();
  const copyLabel = copied ? tr('Nusxalandi', 'Скопировано', 'Copied') : tr('Karta raqamini nusxalash', 'Скопировать номер карты', 'Copy card number');

  return (
    <div className="flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 min-w-0">
      <div className="@container min-w-0 flex-1 py-0.5">
        <span className="block font-mono font-semibold text-[min(17px,8.4cqw)] tracking-normal tabular-nums whitespace-nowrap text-slate-900 dark:text-slate-50 select-all">
          {number}
        </span>
        {holder && (
          <span className="block text-[13px] leading-snug text-slate-500 dark:text-slate-400 truncate">{holder}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copyLabel}
        title={copyLabel}
        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors active:bg-emerald-50 dark:active:bg-emerald-950 ${
          copied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        {copied ? <Check className="w-5 h-5" strokeWidth={2.25} /> : <Copy className="w-5 h-5" strokeWidth={1.75} />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? tr('Nusxalandi', 'Скопировано', 'Copied') : ''}
      </span>
    </div>
  );
};
