import React, { useState, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  ChevronRight,
  Plus,
  KeyRound,
  GraduationCap,
  Building2,
  Globe2,
  UserCheck,
  BookOpen,
  RefreshCw,
  Cloud,
  School,
  Edit3,
  Trash2,
  User,
} from 'lucide-react';
import {
  MAIN_CATEGORIES,
  MainCategory,
  TestPackage,
  TestBlock,
} from '../types';
import { triggerHaptic } from '../utils/telegram';
import { getUnlockRequirementsMessage } from '../utils/testSplitter';
import { fetchCloudTests, deleteTestFromCloud } from '../services/testSyncService';
import { decodeHtmlEntities } from '../utils/security';

interface TestListProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
  onEditTest?: (pkg: TestPackage) => void;
}

export const TestList: React.FC<TestListProps> = ({ onStartTest, onOpenCreateModal, onEditTest }) => {
  const { testPackages, universities, profile, deleteTestPackage } = useQuizStore();
  const { t } = useTranslation();

  const [activeCategory, setActiveCategory] = useState<MainCategory>('Oliy Ta\'lim (HEMIS)');
  const [selectedUniFilter, setSelectedUniFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyTests, setOnlyMyTests] = useState(false);
  const [passwordModalPkg, setPasswordModalPkg] = useState<TestPackage | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Automatically sync with cloud on mount and when window regains focus
  useEffect(() => {
    fetchCloudTests().catch((err) => console.debug('TestList sync notice:', err));

    const handleFocus = () => {
      fetchCloudTests().catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Lock explanation modal state (sequential block lock)
  const [lockExplanation, setLockExplanation] = useState<{
    blockTitle: string;
    prevBlockTitle: string;
    message: string;
  } | null>(null);

  const [deletingPkg, setDeletingPkg] = useState<TestPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const myTestsCount = testPackages.filter((p) => p.authorId === profile.id).length;

  const handleDeleteTest = (pkg: TestPackage) => {
    triggerHaptic('warning');
    setDeletingPkg(pkg);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPkg || isDeleting) return;
    const targetId = deletingPkg.id;

    triggerHaptic('medium');
    // 1. Immediately delete from local store (instant UI update)
    deleteTestPackage(targetId);
    setDeletingPkg(null);
    setIsDeleting(false);
    triggerHaptic('success');

    // 2. Delete from Supabase cloud in background
    try {
      await deleteTestFromCloud(targetId);
    } catch (err) {
      console.warn('Cloud delete error:', err);
    }
  };

  // Filter test packages by active category, author scope, and search query
  const filteredPackages = testPackages.filter((pkg) => {
    if (onlyMyTests && pkg.authorId !== profile.id) {
      return false;
    }
    const pkgCategory = pkg.category || 'Oliy Ta\'lim (HEMIS)';
    const matchesCategory = onlyMyTests ? true : pkgCategory === activeCategory;
    const matchesUni =
      selectedUniFilter === 'all' ||
      (pkg.university && pkg.university.toLowerCase() === selectedUniFilter.toLowerCase());
    const matchesSearch =
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesUni && matchesSearch;
  });

  const getCategoryIcon = (cat: MainCategory) => {
    switch (cat) {
      case 'Oliy Ta\'lim (HEMIS)':
        return <GraduationCap className="w-4 h-4 shrink-0" />;
      case 'O\'quv Markazi':
        return <Building2 className="w-4 h-4 shrink-0" />;
      case 'Xalqaro Sertifikatlar (IELTS, TOPIK, SAT, TOEFL)':
        return <Globe2 className="w-4 h-4 shrink-0" />;
      case 'Abituriyent':
        return <UserCheck className="w-4 h-4 shrink-0" />;
      case 'Maktab':
        return <BookOpen className="w-4 h-4 shrink-0" />;
    }
  };

  const getCategoryTitle = (cat: MainCategory) => {
    switch (cat) {
      case 'Oliy Ta\'lim (HEMIS)':
        return t.catHemis;
      case 'O\'quv Markazi':
        return t.catCenter;
      case 'Xalqaro Sertifikatlar (IELTS, TOPIK, SAT, TOEFL)':
        return t.catCert;
      case 'Abituriyent':
        return t.catApplicant;
      case 'Maktab':
        return t.catSchool;
      default:
        return cat;
    }
  };

  const handleTestClick = (pkg: TestPackage, block: TestBlock) => {
    // 1. If sequential block is locked
    if (block.isLocked) {
      triggerHaptic('warning');
      const prevBlock = pkg.blocks.find((b) => b.blockNumber === block.blockNumber - 1) || pkg.blocks[0];
      const userScore = prevBlock.bestScore || 0;
      const passing = prevBlock.passingScore;

      const message = getUnlockRequirementsMessage(
        prevBlock.title,
        userScore,
        passing,
        block.title
      );

      setLockExplanation({
        blockTitle: block.title,
        prevBlockTitle: prevBlock.title,
        message,
      });
      return;
    }

    // 2. If private test with password
    if (!pkg.isPublic && pkg.password) {
      triggerHaptic('selection');
      setPasswordModalPkg(pkg);
      setTargetBlockId(block.id);
      setPasswordInput('');
      setPasswordError('');
      return;
    }

    triggerHaptic('medium');
    onStartTest(pkg, block.id);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalPkg) return;

    if (!passwordInput.trim()) {
      setPasswordError(t.fieldRequired);
      return;
    }

    if (passwordInput.trim() === passwordModalPkg.password) {
      triggerHaptic('success');
      const pkg = passwordModalPkg;
      const bId = targetBlockId;
      setPasswordModalPkg(null);
      onStartTest(pkg, bId);
    } else {
      triggerHaptic('error');
      setPasswordError(t.wrongPassword);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Create Test Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {t.navTests}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getCategoryTitle(activeCategory)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isSyncing}
            onClick={async () => {
              triggerHaptic('light');
              setIsSyncing(true);
              await fetchCloudTests();
              setIsSyncing(false);
              triggerHaptic('success');
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
            title="Bulutdan testlarni yangilash"
            aria-label="Refresh tests from cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-500' : ''}`} />
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenCreateModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.createTestBtn}</span>
          </button>
        </div>
      </div>

      {/* Scope Selector: All Tests vs My Created Tests */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setOnlyMyTests(false);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            !onlyMyTests
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Barcha testlar ({testPackages.length})
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setOnlyMyTests(true);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            onlyMyTests
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Mening testlarim ({myTestsCount})</span>
        </button>
      </div>

      {/* Multi-Track Category Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {MAIN_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                triggerHaptic('selection');
                setActiveCategory(cat);
              }}
              className={`shrink-0 px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{getCategoryTitle(cat)}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input for Category */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-medium"
        />
      </div>

      {/* University (OTM) Quick Filter Bar */}
      {activeCategory === "Oliy Ta'lim (HEMIS)" && universities && universities.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setSelectedUniFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              selectedUniFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Barcha OTMlar
          </button>
          {profile.university && (
            <button
              onClick={() => {
                triggerHaptic('selection');
                setSelectedUniFilter(profile.university!);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedUniFilter.toLowerCase() === profile.university.toLowerCase()
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <School className="w-3 h-3" />
              <span>Mening OTMim</span>
            </button>
          )}
          {universities
            .filter((u) => u !== profile.university)
            .map((u) => (
              <button
                key={u}
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedUniFilter(u);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedUniFilter.toLowerCase() === u.toLowerCase()
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {u.length > 25 ? u.substring(0, 22) + '...' : u}
              </button>
            ))}
        </div>
      )}

      {/* Tests Grid */}
      <div className="space-y-3">
        {filteredPackages.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {onlyMyTests ? 'Siz hali test yaratmagansiz' : t.emptyCategoryTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs mx-auto">
              {onlyMyTests
                ? "O'zingiz yoki guruhingiz uchun yangi test yaratib, barcha talabalar bilan ulashing."
                : t.emptyCategoryDesc}
            </p>
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenCreateModal();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createTestBtn}</span>
            </button>
          </div>
        ) : (
          filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                      {decodeHtmlEntities(pkg.department)}
                    </span>

                    {!pkg.isPublic ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                        <Lock className="w-3 h-3" />
                        <span>{t.privateAccess}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        <span>{t.publicAccess}</span>
                      </span>
                    )}

                    {pkg.isCommunityCreated && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                        Hamjamiyat testi
                      </span>
                    )}

                    {pkg.authorId === profile.id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                        Sizning testingiz
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {decodeHtmlEntities(pkg.title)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {decodeHtmlEntities(pkg.university || '')} • Muallif: {decodeHtmlEntities(pkg.authorName || '')}
                  </p>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">
                    {pkg.totalQuestions} savol
                  </span>

                  {pkg.authorId === profile.id && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          onEditTest?.(pkg);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-all active:scale-95 border border-indigo-200/50 dark:border-indigo-800/50"
                        title="Testni tahrirlash"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(pkg);
                        }}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-all active:scale-95 border border-rose-200/50 dark:border-rose-900/50"
                        title="Testni o'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sequential Test Blocks Selection */}
              <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Test bloklari:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {pkg.blocks.map((block) => {
                    const isLocked = block.isLocked;
                    const isPassed = block.isPassed;

                    return (
                      <button
                        key={block.id}
                        onClick={() => handleTestClick(pkg, block)}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[60px] active:scale-[0.98] ${
                          isLocked
                            ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                            : isPassed
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 hover:border-emerald-500'
                            : 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-100 hover:border-indigo-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs flex items-center gap-1">
                            {!pkg.isPublic && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span>{decodeHtmlEntities(block.title)}</span>
                          </span>
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          ) : isPassed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="opacity-80">
                            {block.questions.length} savol
                          </span>
                          <span>
                            {isLocked ? (
                              'Qulflangan'
                            ) : block.bestScore !== undefined && block.bestScore > 0 ? (
                              <span className="font-bold">Eng yaxshi: {block.bestScore}/{block.questions.length}</span>
                            ) : (
                              'Boshlash'
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lock Explanation Modal */}
      {lockExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
              {lockExplanation.blockTitle} Qulflangan!
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 mb-5">
              {lockExplanation.message}
            </p>

            <button
              onClick={() => setLockExplanation(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all active:scale-95"
            >
              Tushundim
            </button>
          </div>
        </div>
      )}

      {/* Private Test Password Modal: prompts exact text required */}
      {passwordModalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t.enterPasswordTitle}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {passwordModalPkg.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              {t.enterPasswordPrompt}
            </p>

            {passwordError && (
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-3">
                {passwordError}
              </div>
            )}

            <form noValidate onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  autoFocus
                  placeholder={t.passwordPlaceholder}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModalPkg(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
                >
                  {t.unlockBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom In-App Delete Confirmation Modal - 100% reliable across Telegram & Web */}
      {deletingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
              Testni o'chirish
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              Haqiqatan ham <strong className="text-slate-900 dark:text-white">"{deletingPkg.title}"</strong> testini butunlay o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingPkg(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>O'chirilmoqda...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ha, o'chirish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
