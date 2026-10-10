import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, X, Check, Inbox, RotateCcw, Loader2 } from 'lucide-react';
import { useQuizStore, normalizeUniversityKey } from '../store/useQuizStore';
import { SearchableUniversitySelect } from './SearchableUniversitySelect';
import { UNIVERSITY_FACULTIES } from '../data/universityFaculties';
import { groupByFaculty, facultyKey, OTHER_FACULTY } from '../utils/faculty';
import { triggerHaptic } from '../utils/telegram';
import {
  useFacultyStore,
  loadFaculties,
  getUniversityFaculties,
  saveUniversityFaculties,
  dismissFacultyRequest,
} from '../services/facultyService';

const OFFICIAL_BY_KEY: Record<string, string[]> = Object.fromEntries(
  Object.entries(UNIVERSITY_FACULTIES).map(([name, info]) => [normalizeUniversityKey(name), info.faculties])
);

/**
 * Admin panel: OTM yo'nalishlarini (fakultetlarini) boshqarish.
 * - Talabalar qo'lda yozgan yo'nalishlar bo'yicha so'rovlar
 * - Tanlangan OTM ro'yxatiga qo'shish / o'chirish (hamma foydalanuvchiga darhol ko'rinadi)
 */
export const AdminFacultyManager: React.FC<{ notify: (msg: string) => void }> = ({ notify }) => {
  const { universities, testPackages } = useQuizStore();
  const overrides = useFacultyStore((s) => s.overrides);
  const requests = useFacultyStore((s) => s.requests);
  const [uni, setUni] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadFaculties(true).catch(() => {});
  }, []);

  const current = useMemo(() => (uni ? getUniversityFaculties(uni, overrides) : []), [uni, overrides]);
  const currentKeys = useMemo(() => new Set(current.map(facultyKey)), [current]);

  // Testlarda ishlatilgan, lekin ro'yxatda yo'q yo'nalishlar (bir bosishda qo'shish uchun)
  const usedNotInList = useMemo(() => {
    if (!uni) return [] as string[];
    const target = normalizeUniversityKey(uni);
    return groupByFaculty(
      (testPackages || []).filter((p) => normalizeUniversityKey(p.university || '') === target)
    )
      .map((g) => g.name)
      .filter((n) => n !== OTHER_FACULTY && !currentKeys.has(facultyKey(n)));
  }, [uni, testPackages, currentKeys]);

  const hasOverride = useMemo(
    () => Object.keys(overrides || {}).some((k) => normalizeUniversityKey(k) === normalizeUniversityKey(uni)),
    [overrides, uni]
  );

  const save = async (university: string, list: string[], okMsg: string) => {
    setBusy(true);
    const r = await saveUniversityFaculties(university, list);
    setBusy(false);
    triggerHaptic(r.ok ? 'success' : 'error');
    notify(r.ok ? okMsg : r.message);
    return r.ok;
  };

  const addName = async (name: string, university = uni) => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!university || clean.length < 2) return;
    const list = getUniversityFaculties(university, overrides);
    if (list.some((f) => facultyKey(f) === facultyKey(clean))) {
      notify("Bu yo'nalish ro'yxatda allaqachon bor.");
      return;
    }
    const ok = await save(university, [...list, clean], `"${clean}" qo'shildi.`);
    if (ok && university === uni) setNewName('');
  };

  const removeName = async (name: string) => {
    await save(uni, current.filter((f) => f !== name), `"${name}" olib tashlandi.`);
  };

  return (
    <div className="space-y-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        <span>Yo'nalishlar (fakultetlar)</span>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" strokeWidth={1.75} />}
      </h4>

      {/* So'rovlar */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Inbox className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Talabalar so'rovlari ({requests.length})</span>
        </p>
        {requests.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Yangi so'rov yo'q.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 space-y-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-rose-700 dark:text-rose-300 break-words">{r.faculty}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                    {r.university}
                    {r.count > 1 ? ` · ${r.count} marta so'ralgan` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addName(r.faculty, r.university)}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Ro'yxatga qo'shish</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const res = await dismissFacultyRequest(r.id);
                      setBusy(false);
                      notify(res.message);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 disabled:opacity-50"
                  >
                    Rad etish
                  </button>
                  <button
                    type="button"
                    onClick={() => setUni(r.university)}
                    className="px-3 py-2 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                  >
                    OTMni ochish
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OTM bo'yicha ro'yxat */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <SearchableUniversitySelect
          label="OTMni tanlang:"
          value={uni}
          onChange={(v) => setUni(v)}
          universities={universities}
          allowCustom={false}
        />

        {uni && (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ro'yxat ({current.length} ta){hasOverride ? ' · admin tahrirlagan' : ' · rasmiy saytdan'}
              </p>
              {hasOverride && (OFFICIAL_BY_KEY[normalizeUniversityKey(uni)] || []).length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    save(uni, OFFICIAL_BY_KEY[normalizeUniversityKey(uni)] || [], "Rasmiy ro'yxat tiklandi.")
                  }
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Rasmiyni tiklash</span>
                </button>
              )}
            </div>

            {current.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Ro'yxat bo'sh. Quyidan yo'nalish qo'shing.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {current.map((name) => (
                  <span
                    key={name}
                    className="pl-3 pr-1 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeName(name)}
                      aria-label={`${name} ni olib tashlash`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {usedNotInList.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Testlarda ishlatilgan, lekin ro'yxatda yo'q (bosib qo'shing):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {usedNotInList.map((name) => (
                    <button
                      type="button"
                      key={name}
                      disabled={busy}
                      onClick={() => addName(name)}
                      className="px-3 py-2 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addName(newName);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Yangi yo'nalish nomi, masalan: Tarix"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={busy || newName.trim().length < 2}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                <span>Qo'shish</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
