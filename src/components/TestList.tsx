import React, { useState, useEffect, useMemo } from 'react';
import { useQuizStore, useIsAdmin, normalizeUniversityKey } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { AdminEditQuizModal } from './AdminEditQuizModal';
import {
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  ChevronRight,
  Plus,
  KeyRound,
  School,
  Edit3,
  Trash2,
  User,
  Calendar,
  RefreshCw,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { TestPackage, TestBlock } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { getUnlockRequirementsMessage } from '../utils/testSplitter';
import { fetchCloudTests, deleteTestFromCloud } from '../services/testSyncService';
import { decodeHtmlEntities } from '../utils/security';
import { isBlockUnlocked } from '../utils/progressUtils';
import { isPaidUser, getTodayAttemptsCount, DAILY_FREE_TEST_LIMIT } from '../services/paywallService';

const getUniversityMonogram = (name: string): string => {
  if (!name) return 'OTM';
  const match = name.match(/\(([^)]+)\)/);
  if (match && match[1] && match[1].trim().length <= 8) {
    return match[1].trim().toUpperCase();
  }
  const trimmed = name.trim();
  if (trimmed.length <= 6) {
    return trimmed;
  }
  const words = trimmed.split(/[\s-]+/).filter((w) => w.length > 0 && !/^(va|dagi|nomidagi)$/i.test(w));
  const initials = words.map((w) => w[0].toUpperCase()).join('');
  return initials.slice(0, 5) || 'OTM';
};

interface TestListProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
  onEditTest?: (pkg: TestPackage) => void;
  onOpenReceiptModal?: () => void;
}

export const TestList: React.FC<TestListProps> = ({
  onStartTest,
  onOpenCreateModal,
  onEditTest,
  onOpenReceiptModal,
}) => {
  const { testPackages, profile, testAttempts, deleteTestPackage } = useQuizStore();
  const { t } = useTranslation();
  const isAdmin = useIsAdmin();

  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyTests, setOnlyMyTests] = useState(false);
  const [adminEditingQuiz, setAdminEditingQuiz] = useState<TestPackage | null>(null);
  const [passwordModalPkg, setPasswordModalPkg] = useState<TestPackage | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSyncTests = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetchCloudTests();
      if (!res.success && res.message && !res.message.includes("yo'q")) {
        setSyncError(res.message);
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Tarmoq xatosi');
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatically sync with cloud on mount and when window regains focus
  useEffect(() => {
    handleSyncTests();

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

  const cleanUserId = String(profile.id || '').replace(/^tg_/, '').replace(/^user_/, '').trim().toLowerCase();
  const rawUserId = String(profile.id || '').trim().toLowerCase();
  const tgId = String(profile.telegram_id || profile.telegramId || '').trim().toLowerCase();
  const tgIdClean = tgId.replace(/^tg_/, '').replace(/^user_/, '').trim().toLowerCase();

  const isUserAuthor = (pkg: TestPackage) => {
    if (!pkg) return false;
    const authorId = String(pkg.authorId || '').trim().toLowerCase();
    const cleanAuthorId = authorId.replace(/^tg_/, '').replace(/^user_/, '').trim();
    const creatorId = String(pkg.creator_id || pkg.creatorId || '').trim().toLowerCase();
    const cleanCreatorId = creatorId.replace(/^tg_/, '').replace(/^user_/, '').trim();

    const currentIds = [cleanUserId, rawUserId, tgId, tgIdClean].filter(Boolean);
    if (
      currentIds.some(
        (id) =>
          id === authorId ||
          id === cleanAuthorId ||
          id === creatorId ||
          id === cleanCreatorId
      )
    ) {
      return true;
    }

    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim().toLowerCase();
    if (fullName && pkg.authorName && pkg.authorName.trim().toLowerCase() === fullName) {
      return true;
    }
    if (profile.username && pkg.authorName && pkg.authorName.trim().toLowerCase() === profile.username.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  const myTestPackages = useMemo(() => {
    return testPackages.filter((pkg) => {
      if (!isUserAuthor(pkg)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          pkg.title.toLowerCase().includes(q) ||
          (pkg.department && pkg.department.toLowerCase().includes(q)) ||
          (pkg.university && pkg.university.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [testPackages, profile, cleanUserId, rawUserId, tgId, tgIdClean, searchQuery]);

  const myTestsCount = useMemo(() => {
    return testPackages.filter((p) => isUserAuthor(p)).length;
  }, [testPackages, profile, cleanUserId, rawUserId, tgId, tgIdClean]);

  const handleDeleteTest = (pkg: TestPackage) => {
    triggerHaptic('warning');
    setDeletingPkg(pkg);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPkg || isDeleting) return;
    const targetId = deletingPkg.id;

    triggerHaptic('medium');
    deleteTestPackage(targetId);
    setDeletingPkg(null);
    setIsDeleting(false);
    triggerHaptic('success');

    try {
      await deleteTestFromCloud(targetId);
    } catch (err) {
      console.warn('Cloud delete error:', err);
    }
  };

  // Calculate list of universities that actually have tests in the database
  const universityCatalog = useMemo(() => {
    const uniMap = new Map<string, { name: string; packages: TestPackage[] }>();
    testPackages.forEach((pkg) => {
      const rawUni = (pkg.university || "Boshqa OTM").trim();
      const normKey = normalizeUniversityKey(rawUni);
      if (!uniMap.has(normKey)) {
        uniMap.set(normKey, { name: rawUni, packages: [] });
      } else {
        const existing = uniMap.get(normKey)!;
        if (rawUni.length > existing.name.length) {
          existing.name = rawUni;
        }
      }
      uniMap.get(normKey)!.packages.push(pkg);
    });

    const list = Array.from(uniMap.values()).map((entry) => ({
      name: entry.name,
      monogram: getUniversityMonogram(entry.name),
      packages: entry.packages,
      testCount: entry.packages.length,
    }));

    list.sort((a, b) => b.testCount - a.testCount || a.name.localeCompare(b.name, 'uz'));

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase();
    return list.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.monogram.toLowerCase().includes(q) ||
      item.packages.some((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.department && p.department.toLowerCase().includes(q))
      )
    );
  }, [testPackages, searchQuery]);

  // Search matching tests directly when query is entered
  const matchingSearchTests = useMemo(() => {
    if (!searchQuery.trim() || onlyMyTests) return [];
    const q = searchQuery.toLowerCase();
    return testPackages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.university && p.university.toLowerCase().includes(q))
    );
  }, [testPackages, searchQuery, onlyMyTests]);

  // Tests for currently selected university
  const testsForSelectedUni = useMemo(() => {
    if (!selectedUniversity) return [];
    const targetNorm = normalizeUniversityKey(selectedUniversity);
    return testPackages.filter((pkg) => {
      const pkgNorm = normalizeUniversityKey(pkg.university || "Boshqa OTM");
      if (pkgNorm !== targetNorm) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          pkg.title.toLowerCase().includes(q) ||
          (pkg.department && pkg.department.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [testPackages, selectedUniversity, searchQuery]);

  const handleTestClick = (pkg: TestPackage, block: TestBlock) => {
    const isPaid = isPaidUser(profile);
    const blockIndex = pkg.blocks.findIndex((b) => b.id === block.id);
    const unlocked = isUserAuthor(pkg) || isAdmin || isBlockUnlocked(pkg, blockIndex, testAttempts);

    // 1. If sequential block is locked
    if (!unlocked) {
      triggerHaptic('warning');
      const prevBlock =
        pkg.blocks[blockIndex - 1] ||
        pkg.blocks.find((b) => b.blockNumber === block.blockNumber - 1) ||
        pkg.blocks[0];
      const passing =
        prevBlock.passingScore ||
        Math.max(1, Math.ceil((prevBlock.questions?.length || 25) * 0.7));
      const prevAttempts = (testAttempts || []).filter(
        (a) =>
          a.testPackageId === pkg.id &&
          (a.blockId === prevBlock.id || a.blockTitle === prevBlock.title)
      );
      const userScore =
        prevAttempts.length > 0
          ? Math.max(...prevAttempts.map((a) => a.score))
          : prevBlock.bestScore || 0;

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

  const renderTestCard = (pkg: TestPackage) => (
    <div
      key={pkg.id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {pkg.department && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                {decodeHtmlEntities(pkg.department)}
              </span>
            )}

            {(pkg.studyType || pkg.study_type || pkg.course_year || pkg.semester) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" strokeWidth={1.75} />
                <span>
                  {pkg.studyType || pkg.study_type ? `${pkg.studyType || pkg.study_type} • ` : ''}
                  {pkg.course_year ? `${pkg.course_year}-kurs` : ''}
                  {pkg.course_year && pkg.semester ? ' • ' : ''}
                  {pkg.semester ? `${pkg.semester}-semestr` : ''}
                </span>
              </span>
            )}

            {!pkg.isPublic ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                <Lock className="w-3 h-3" strokeWidth={1.75} />
                <span>{t.privateAccess}</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Unlock className="w-3 h-3" strokeWidth={1.75} />
                <span>{t.publicAccess}</span>
              </span>
            )}

            {pkg.isCommunityCreated && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                {t.communityTestBadge}
              </span>
            )}

            {isUserAuthor(pkg) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/80">
                {t.myTestBadge}
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            {decodeHtmlEntities(pkg.title)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {decodeHtmlEntities(pkg.university || '')} • {t.authorLabel}: {decodeHtmlEntities(pkg.authorName || '')}
          </p>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1.5 ml-2">
          <span className="text-[11px] font-bold text-slate-400">
            {pkg.totalQuestions} {t.questionsCount}
          </span>

          {(isAdmin || isUserAuthor(pkg)) && (
            <div className="flex items-center gap-1 mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setAdminEditingQuiz(pkg);
                }}
                className="flex items-center justify-center leading-none gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-400 font-bold text-[11px] transition-all active:scale-95 border border-amber-200/50 dark:border-amber-800/50"
                title="Tahrirlash"
              >
                <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Tahrirlash</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTest(pkg);
                }}
                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-all active:scale-95 border border-rose-200/50 dark:border-rose-900/50 flex items-center justify-center leading-none"
                title="O'chirish"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sequential Test Blocks Selection */}
      <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
          {t.testBlocksLabel}:
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(pkg.blocks || []).map((block, idx) => {
            const isPaid = isPaidUser(profile);
            const unlocked = isUserAuthor(pkg) || isAdmin || isBlockUnlocked(pkg, idx, testAttempts);
            const isLocked = !unlocked;

            const blockAttempts = (testAttempts || []).filter(
              (a) =>
                a.testPackageId === pkg.id &&
                (a.blockId === block.id || a.blockTitle === block.title)
            );
            const passing =
              block.passingScore ||
              Math.max(1, Math.ceil((block.questions?.length || 25) * 0.7));
            const maxScore =
              blockAttempts.length > 0
                ? Math.max(...blockAttempts.map((a) => a.score))
                : block.bestScore || 0;
            const isPassed = Boolean(
              block.isPassed ||
              maxScore >= passing ||
              blockAttempts.some((a) => a.isPassed || a.score >= passing)
            );
            const todayAttempts = !isPaid ? getTodayAttemptsCount(pkg.id, block.id, testAttempts) : 0;
            const isLimitReached = !isPaid && todayAttempts >= DAILY_FREE_TEST_LIMIT;

            return (
              <button
                key={block.id}
                onClick={() => handleTestClick(pkg, block)}
                className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[60px] active:scale-[0.98] ${
                  isLocked
                    ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    : isLimitReached
                    ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-900/50 text-slate-800 dark:text-slate-200 hover:border-orange-400'
                    : isPassed
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 hover:border-emerald-500'
                    : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1">
                    {!pkg.isPublic && <Lock className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={1.75} />}
                    <span>{decodeHtmlEntities(block.title)}</span>
                  </span>
                  {isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                  ) : isLimitReached ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-100 dark:orange-950/80 text-orange-600 dark:text-orange-400 text-[9px] font-black border border-orange-200 dark:border-orange-800 flex items-center gap-0.5 shrink-0">
                      <Lock className="w-2.5 h-2.5" strokeWidth={1.75} /> {todayAttempts}/{DAILY_FREE_TEST_LIMIT}
                    </span>
                  ) : isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-orange-500 shrink-0" strokeWidth={1.75} />
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="opacity-80">
                    {block.questions?.length || 0} {t.questionsCount}
                  </span>
                  <span>
                    {isLocked ? (
                      t.lockedStatus
                    ) : isLimitReached ? (
                      <span className="text-orange-600 dark:text-orange-400 font-bold">
                        Limit tugagan
                      </span>
                    ) : maxScore > 0 ? (
                      <span className="font-bold">
                        {t.bestScoreLabel}: {maxScore}/{block.questions?.length || 0} ({maxScore * 4} {t.pointsLabel})
                      </span>
                    ) : (
                      t.start
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Create Test Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {selectedUniversity ? decodeHtmlEntities(selectedUniversity) : t.navTests}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedUniversity ? 'Fanlar va test bloklari' : 'OTMlar katalogi'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isSyncing}
            onClick={async () => {
              triggerHaptic('light');
              await handleSyncTests();
              triggerHaptic('success');
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-colors active:scale-95 flex items-center justify-center leading-none"
            title="Bulutdan testlarni yangilash"
            aria-label="Refresh tests from cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenCreateModal();
            }}
            className="flex items-center justify-center leading-none gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.createTestBtn}</span>
          </button>
        </div>
      </div>

      {/* Network / Cloud Sync Error Banner with Retry */}
      {syncError && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span className="truncate">{t.networkErrorNotice}</span>
          </div>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              triggerHaptic('light');
              handleSyncTests();
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shrink-0 transition-colors active:scale-95 flex items-center justify-center leading-none gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{t.retryBtn}</span>
          </button>
        </div>
      )}

      {/* Scope Selector: All Tests vs My Created Tests */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setOnlyMyTests(false);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center leading-none ${
            !onlyMyTests
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {t.allTestsTab} ({testPackages.length})
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setOnlyMyTests(true);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center leading-none gap-1.5 ${
            onlyMyTests
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{t.myTestsTab} ({myTestsCount})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={selectedUniversity ? "Fan nomi yoki yo'nalishni qidirish..." : "OTM yoki test nomini qidirish..."}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-medium"
        />
      </div>

      {onlyMyTests ? (
        /* Mening testlarim ro'yxati (To'g'ridan-to'g'ri kartalar ko'rinishida) */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              Mening testlarim ({myTestPackages.length} ta)
            </span>
          </div>

          {myTestPackages.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {t.myTestsEmptyTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs mx-auto">
                {t.myTestsEmptyDesc}
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenCreateModal();
                }}
                className="flex items-center justify-center leading-none gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{t.createTestBtn}</span>
              </button>
            </div>
          ) : (
            myTestPackages.map((pkg) => renderTestCard(pkg))
          )}
        </div>
      ) : !selectedUniversity ? (
        /* Barcha testlar - OTMlar katalogi yoki qidiruv natijalari */
        <div className="space-y-3">
          {/* Agar qidiruv so'zi kiritilgan bo'lsa va mos testlar topilsa, to'g'ridan-to'g'ri ko'rsatamiz */}
          {searchQuery.trim() && matchingSearchTests.length > 0 && (
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Qidiruv bo'yicha topilgan testlar ({matchingSearchTests.length})</span>
                </span>
              </div>
              {matchingSearchTests.map((pkg) => renderTestCard(pkg))}
            </div>
          )}

          {universityCatalog.length === 0 && matchingSearchTests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <School className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Hozircha testlar mavjud emas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs mx-auto">
                Yangi test qo'shish orqali boshlang yoki boshqa qidiruv so'zini kiriting.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenCreateModal();
                  }}
                  className="flex items-center justify-center leading-none gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.createTestBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {searchQuery.trim() && matchingSearchTests.length > 0 && universityCatalog.length > 0 && (
                <div className="px-1 pt-2">
                  <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    OTMlar katalogi bo'yicha ({universityCatalog.length})
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2.5">
                {universityCatalog.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedUniversity(item.name);
                    }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-black text-xs shrink-0 shadow-sm tracking-wider">
                        {item.monogram}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {decodeHtmlEntities(item.name)}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {item.testCount} ta test
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tanlangan OTM testlari */
        <div className="space-y-3">
          {/* Back Button & Test Count */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedUniversity(null);
              }}
              className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center leading-none gap-1.5 transition-all active:scale-95 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Barcha OTMlar</span>
            </button>
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              {testsForSelectedUni.length} ta test
            </span>
          </div>

          {/* OTM Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-xs shrink-0 tracking-wider shadow-sm">
              {getUniversityMonogram(selectedUniversity)}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {decodeHtmlEntities(selectedUniversity)}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Fanlar va test bloklari
              </p>
            </div>
          </div>

          {testsForSelectedUni.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Bu OTMda testlar topilmadi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs mx-auto">
                Qidiruv so'zini o'zgartiring yoki ushbu OTM uchun yangi test qo'shing.
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenCreateModal();
                }}
                className="flex items-center justify-center leading-none gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{t.createTestBtn}</span>
              </button>
            </div>
          ) : (
            testsForSelectedUni.map((pkg) => renderTestCard(pkg))
          )}
        </div>
      )}

      {/* Lock Explanation Modal */}
      {lockExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
              {lockExplanation.blockTitle} ({t.lockedStatus})
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 mb-5">
              {lockExplanation.message}
            </p>

            <button
              onClick={() => setLockExplanation(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all active:scale-95"
            >
              {t.understandBtn}
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
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-semibold mb-3">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
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
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25"
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
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7" strokeWidth={1.75} />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
              {t.deleteTestModalTitle}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {t.deleteTestModalPrompt} <strong className="text-slate-900 dark:text-white">"{deletingPkg.title}"</strong>?
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingPkg(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>{t.deletingStatus}</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>{t.deleteConfirmBtn}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quiz Edit Modal (Faqat Administrator uchun) */}
      {adminEditingQuiz && (
        <AdminEditQuizModal
          quiz={adminEditingQuiz}
          isOpen={Boolean(adminEditingQuiz)}
          onClose={() => setAdminEditingQuiz(null)}
          onSaved={() => {
            handleSyncTests();
          }}
        />
      )}
    </div>
  );
};
