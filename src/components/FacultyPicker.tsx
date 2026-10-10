import React, { useEffect, useMemo, useState } from 'react';
import { PenLine, Check } from 'lucide-react';
import { facultyKey } from '../utils/faculty';
import { triggerHaptic } from '../utils/telegram';
import { useFacultyStore, getUniversityFaculties, loadFaculties } from '../services/facultyService';

interface FacultyPickerProps {
  university: string;
  value: string;
  onChange: (name: string) => void;
  hasError?: boolean;
  /** Qo'lda yozilgan yo'nalish uchun ogohlantirish matni */
  manualHint?: string;
}

const COLLAPSED_COUNT = 10;

/**
 * Yo'nalish / fakultet tanlash.
 * Faqat OTM ro'yxatidagi yo'nalishlardan tanlanadi. Ro'yxatda yo'q bo'lsa, eng oxirdagi
 * qizil "✏️ Qo'lda yozish" tugmasi orqali yoziladi va bu adminga so'rov bo'lib boradi.
 */
export const FacultyPicker: React.FC<FacultyPickerProps> = ({
  university,
  value,
  onChange,
  hasError,
  manualHint = "Bu yo'nalish ro'yxatda yo'q. Test saqlangach, admin tekshirib ro'yxatga qo'shadi.",
}) => {
  const overrides = useFacultyStore((s) => s.overrides);
  const loaded = useFacultyStore((s) => s.loaded);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!loaded) loadFaculties().catch(() => {});
  }, [loaded]);

  const list = useMemo(() => getUniversityFaculties(university, overrides), [university, overrides]);
  const valueKey = facultyKey(value);
  const inList = Boolean(valueKey) && list.some((f) => facultyKey(f) === valueKey);

  // Qo'lda yozish rejimi: qiymat ro'yxatda bo'lmasa yoki foydalanuvchi uni tanlasa
  const [manualMode, setManualMode] = useState<boolean>(Boolean(value) && !inList);
  useEffect(() => {
    // OTM almashganda yoki ro'yxat yuklanganda rejimni moslashtiramiz
    if (value && inList) setManualMode(false);
    if (value && !inList && list.length > 0) setManualMode(true);
    if (!list.length) setManualMode(true);
  }, [university, list.length, inList, value]);

  if (!university.trim()) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avval OTMni tanlang, keyin yo'nalish chiqadi.</p>
    );
  }

  const shown = expanded ? list : list.slice(0, COLLAPSED_COUNT);
  const hiddenCount = list.length - shown.length;

  return (
    <div className="space-y-2">
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((name) => {
            const active = !manualMode && facultyKey(name) === valueKey;
            return (
              <button
                type="button"
                key={name}
                onClick={() => {
                  triggerHaptic('selection');
                  setManualMode(false);
                  onChange(name);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 text-left flex items-center gap-1 ${
                  active
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {active && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
                <span>{name}</span>
              </button>
            );
          })}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-dashed border-emerald-300 dark:border-emerald-800"
            >
              Yana {hiddenCount} ta
            </button>
          )}

          {/* Eng oxirida: qo'lda yozish (qizil, ruchka belgisi bilan) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setManualMode(true);
              if (inList) onChange('');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 flex items-center gap-1.5 ${
              manualMode
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300'
            }`}
          >
            <PenLine className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>Ro'yxatda yo'q — qo'lda yozish</span>
          </button>
        </div>
      )}

      {(manualMode || list.length === 0) && (
        <div className="space-y-1.5">
          {list.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bu OTM uchun yo'nalishlar ro'yxati hali kiritilmagan. Yo'nalish nomini yozing.
            </p>
          )}
          <div className="relative">
            <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" strokeWidth={1.75} />
            <input
              type="text"
              value={inList ? '' : value}
              autoFocus={list.length > 0}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Yo'nalish nomini aniq yozing, masalan: Tarix"
              className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 ${
                hasError ? 'border-rose-500' : 'border-rose-300 dark:border-rose-800'
              }`}
            />
          </div>
          {value.trim() && !inList && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{manualHint}</p>
          )}
        </div>
      )}
    </div>
  );
};
