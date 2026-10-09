import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, Building2, ChevronDown, Plus, School, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { useQuizStore, normalizeUniversityKey } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';

interface SearchableUniversitySelectProps {
  value: string;
  onChange: (value: string) => void;
  universities?: string[];
  customUniversities?: string[];
  label?: string;
  placeholder?: string;
  allowCustom?: boolean;
  isCustomSelected?: boolean;
  onCustomSelect?: () => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Normalizes text for search by removing accents, apostrophes, and punctuation.
 */
function normalizeForSearch(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/['`ʻʼ’]/g, '')
    .replace(/[()]/g, ' ')
    .trim();
}

export const SearchableUniversitySelect: React.FC<SearchableUniversitySelectProps> = ({
  value,
  onChange,
  universities: propUniversities,
  customUniversities: propCustomUnis,
  label,
  placeholder,
  allowCustom = true,
  isCustomSelected = false,
  onCustomSelect,
  error,
  className = '',
  disabled = false,
}) => {
  const storeUniversities = useQuizStore((state) => state.universities);
  const storeCustomUnis = useQuizStore((state) => state.customUniversities);
  const storeDeletedUniversities = useQuizStore((state) => state.deletedUniversities);
  const { t } = useTranslation();

  const effectivePlaceholder = placeholder || t.selectUniPlaceholder;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Gather all universities, case-insensitively deduplicate, respect deletions, and SORT ALPHABETICALLY (A-Z)
  // RULE: Universities always remain in Uzbek to maintain official brand names and abbreviations
  const sortedUniversities = useMemo(() => {
    const rawList = [
      ...(propUniversities || storeUniversities || []),
      ...(propCustomUnis || storeCustomUnis || []),
    ];

    const deletedSet = new Set(
      (storeDeletedUniversities || []).map((u) => normalizeUniversityKey(u))
    );

    const uniMap = new Map<string, string>();
    for (const u of rawList) {
      const trimmed = (u || '').trim();
      if (!trimmed) continue;
      const key = normalizeUniversityKey(trimmed);
      if (deletedSet.has(key)) continue;

      if (!uniMap.has(key)) {
        uniMap.set(key, trimmed);
      } else {
        const existing = uniMap.get(key)!;
        const existingUpper = (existing.match(/[A-Z]/g) || []).length;
        const newUpper = (trimmed.match(/[A-Z]/g) || []).length;
        if (newUpper > existingUpper) {
          uniMap.set(key, trimmed);
        }
      }
    }

    // Sort alphabetically using Uzbek locale collation (A-Z)
    return Array.from(uniMap.values()).sort((a, b) =>
      a.localeCompare(b, 'uz', { sensitivity: 'base' })
    );
  }, [propUniversities, storeUniversities, propCustomUnis, storeCustomUnis, storeDeletedUniversities]);

  // 2. Filter universities based on flexible search (matches anywhere, start, middle, or abbreviation)
  const filteredUniversities = useMemo(() => {
    const cleanQuery = normalizeForSearch(searchQuery);
    if (!cleanQuery) return sortedUniversities;

    const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

    return sortedUniversities.filter((uni) => {
      const normalizedUni = normalizeForSearch(uni);
      // Every term in search query must appear somewhere in the university name
      return queryTerms.every((term) => normalizedUni.includes(term));
    });
  }, [sortedUniversities, searchQuery]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    triggerHaptic('light');
    setIsOpen(true);
  };

  const handleClose = () => {
    triggerHaptic('light');
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (uni: string) => {
    triggerHaptic('selection');
    onChange(uni);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleChooseCustom = () => {
    triggerHaptic('medium');
    if (onCustomSelect) {
      onCustomSelect();
    } else {
      onChange('custom');
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayValue = isCustomSelected
    ? t.addCustomUniPrompt
    : value || effectivePlaceholder;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button - Perfectly Constrained within Boundaries */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full px-3 py-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2.5 transition-all outline-none ${
          disabled
            ? 'opacity-60 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 cursor-not-allowed'
            : error
            ? 'bg-orange-50/50 dark:bg-orange-950/30 border-orange-400 text-slate-900 dark:text-white ring-1 ring-orange-400'
            : 'bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white active:scale-[0.99] focus:ring-2 focus:ring-emerald-500'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <School className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.75} />
          <span
            className={`truncate ${
              !value && !isCustomSelected
                ? 'text-slate-400 dark:text-slate-500 font-normal'
                : 'font-bold'
            }`}
          >
            {displayValue}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform" strokeWidth={1.75} />
      </button>

      {error && (
        <p className="text-[11px] text-orange-500 font-semibold mt-1">
          {error}
        </p>
      )}

      {/* Searchable University Bottom Sheet / Modal (Fully Constrained to Viewport) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] supports-[height:100dvh]:max-h-[88dvh] sm:max-h-[82vh] overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Top Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header: Title + Close Button */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {t.selectUniModalTitle}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.alphabeticalOrderDesc} ({filteredUniversities.length} OTM)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                title={t.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* First Row Search Input with Lupa (Magnifying Glass) */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchUniInputPlaceholder}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Alphabetical University List Container */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1 overscroll-contain">
              {/* Option to Add Custom University */}
              {allowCustom && (
                <button
                  type="button"
                  onClick={handleChooseCustom}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-bold flex items-center justify-between gap-2.5 border transition-all mb-1 ${
                    isCustomSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-dashed border-emerald-300 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="truncate">{t.addCustomUniPrompt}</span>
                  </div>
                  {isCustomSelected && (
                    <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              )}

              {/* Universities List in Strict Alphabetical Order (All OTM Names remain in Uzbek as required) */}
              {filteredUniversities.length > 0 ? (
                filteredUniversities.map((uni) => {
                  const isSelected = !isCustomSelected && value.toLowerCase() === uni.toLowerCase();

                  return (
                    <button
                      key={uni}
                      type="button"
                      onClick={() => handleSelect(uni)}
                      className={`w-full p-3 rounded-2xl text-left text-xs font-semibold flex items-center justify-between gap-3 transition-colors active:scale-[0.99] ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 font-bold shadow-sm'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <School
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="leading-snug break-words">{uni}</span>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    "{searchQuery}" {t.uniNotFound}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">
                    {t.uniNotFoundTip}
                  </p>

                  {allowCustom && (
                    <button
                      type="button"
                      onClick={handleChooseCustom}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addAsCustomBtn}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Safe padding spacer at bottom for mobile gesture bars */}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
