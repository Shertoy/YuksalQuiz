import React, { useMemo, useState } from 'react';
import { useQuizStore, normalizeUniversityKey } from '../store/useQuizStore';
import { UNIVERSITY_FACULTIES } from '../data/universityFaculties';
import { groupByFaculty, facultyKey, OTHER_FACULTY } from '../utils/faculty';
import { triggerHaptic } from '../utils/telegram';

// OTM nomi bo'yicha rasmiy fakultetlar ro'yxati (nom yozilishidagi kichik farqlarga chidamli)
const OFFICIAL_BY_KEY: Record<string, string[]> = Object.fromEntries(
  Object.entries(UNIVERSITY_FACULTIES).map(([name, info]) => [normalizeUniversityKey(name), info.faculties])
);

interface FacultyPickerProps {
  university: string;
  value: string;
  onChange: (name: string) => void;
}

const COLLAPSED_COUNT = 8;

/**
 * Yo'nalish / fakultet tanlash tugmalari:
 * 1) shu OTMda testlarda allaqachon ishlatilgan yo'nalishlar (talabalar shu nomlar bilan ko'radi)
 * 2) OTMning rasmiy fakultetlari
 * Muallif baribir maydonga o'zi yozishi mumkin.
 */
export const FacultyPicker: React.FC<FacultyPickerProps> = ({ university, value, onChange }) => {
  const testPackages = useQuizStore((s) => s.testPackages);
  const [expanded, setExpanded] = useState(false);

  const { used, official } = useMemo(() => {
    const uniName = (university || '').trim();
    if (!uniName) return { used: [] as string[], official: [] as string[] };
    const target = normalizeUniversityKey(uniName);
    const usedNames = groupByFaculty(
      (testPackages || []).filter((p) => normalizeUniversityKey(p.university || '') === target)
    )
      .map((g) => g.name)
      .filter((n) => n !== OTHER_FACULTY);
    const usedKeys = new Set(usedNames.map(facultyKey));
    const officialNames = (OFFICIAL_BY_KEY[target] || []).filter((n) => !usedKeys.has(facultyKey(n)));
    return { used: usedNames, official: officialNames };
  }, [testPackages, university]);

  if (!used.length && !official.length) return null;

  const activeKey = facultyKey(value);
  const officialShown = expanded ? official : official.slice(0, Math.max(0, COLLAPSED_COUNT - used.length));
  const hiddenCount = official.length - officialShown.length;

  const chip = (name: string, kind: 'used' | 'official') => {
    const isActive = facultyKey(name) === activeKey;
    return (
      <button
        type="button"
        key={`${kind}-${name}`}
        onClick={() => {
          triggerHaptic('selection');
          onChange(name);
        }}
        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 text-left ${
          isActive
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : kind === 'used'
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
        }`}
      >
        {name}
      </button>
    );
  };

  return (
    <div className="mt-2 space-y-2">
      {used.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Bu OTMdagi testlarda ishlatilgan:</p>
          <div className="flex flex-wrap gap-1.5">{used.map((n) => chip(n, 'used'))}</div>
        </div>
      )}
      {official.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">OTMning fakultetlari:</p>
          <div className="flex flex-wrap gap-1.5">
            {officialShown.map((n) => chip(n, 'official'))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 underline-offset-2 hover:underline"
              >
                Yana {hiddenCount} ta
              </button>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-slate-400">Ro'yxatda yo'q bo'lsa, yuqoridagi maydonga o'zingiz yozing.</p>
    </div>
  );
};
