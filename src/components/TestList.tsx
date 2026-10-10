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
  GraduationCap,
} from 'lucide-react';
import { TestPackage, TestBlock } from '../types';
import { triggerHaptic, useTelegramBackButton } from '../utils/telegram';
import { groupByFaculty, facultyKey, getPackageFaculty, OTHER_FACULTY } from '../utils/faculty';
import { getUnlockRequirementsMessage, localizeBlockTitle } from '../utils/testSplitter';
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
  const { t, tr } = useTranslation();
  const isAdmin = useIsAdmin();

  // Oxirgi tanlangan (yoki profildagi) universitet eslab qolinadi: har testdan keyin qayta tanlash shart emas
  const [selectedUniversity, setSelectedUniversityState] = useState<string | null>(() => {
    const hasTests = (name?: string | null) => {
      if (!name) return false;
      const key = normalizeUniversityKey(name);
      return (testPackages || []).some((p) => normalizeUniversityKey(p.university || '') === key);
    };
    let last: string | null = null;
    try {
      last = localStorage.getItem('yuksal_last_university');
    } catch {}
    if (hasTests(last)) return last;
    if (hasTests(profile?.university)) return profile.university as string;
    return null;
  });
  const setSelectedUniversity = (name: string | null) => {
    setSelectedUniversityState(name);
    // Boshqa universitetga o'tilganda yo'nalish tanlovi tozalanadi
    setSelectedFacultyState(null);
    try {
      if (name) localStorage.setItem('yuksal_last_university', name);
      else localStorage.removeItem('yuksal_last_university');
      localStorage.removeItem('yuksal_last_faculty');
    } catch {}
  };

  // Tanlangan yo'nalish (fakultet) kaliti. Oxirgi tanlov eslab qolinadi.
  const [selectedFaculty, setSelectedFacultyState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('yuksal_last_faculty');
    } catch {
      return null;
    }
  });
  const setSelectedFaculty = (key: string | null) => {
    setSelectedFacultyState(key);
    try {
      if (key) localStorage.setItem('yuksal_last_faculty', key);
      else localStorage.removeItem('yuksal_last_faculty');
    } catch {}
  };
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
      setSyncError(err?.message || tr('Tarmoq xatosi', 'Ошибка сети', 'Network error'));
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

    setIsDeleting(true);
    triggerHaptic('medium');
    deleteTestPackage(targetId);

    try {
      await deleteTestFromCloud(targetId);
    } catch (err) {
      console.warn('Cloud delete error:', err);
    } finally {
      setDeletingPkg(null);
      setIsDeleting(false);
      triggerHaptic('success');
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

  // Tanlangan OTM testlari yo'nalishlar bo'yicha (qidiruvsiz, to'liq ro'yxat asosida)
  const facultyGroups = useMemo(() => {
    if (!selectedUniversity) return [];
    const targetNorm = normalizeUniversityKey(selectedUniversity);
    return groupByFaculty(
      testPackages.filter(
        (pkg) => normalizeUniversityKey(pkg.university || 'Boshqa OTM') === targetNorm
      )
    );
  }, [testPackages, selectedUniversity]);

  const activeFaculty = useMemo(
    () => (selectedFaculty ? facultyGroups.find((g) => g.key === selectedFaculty) || null : null),
    [facultyGroups, selectedFaculty]
  );

  // Yo'nalishlar ro'yxatini ko'rsatish kerakmi: 2 va undan ko'p yo'nalish bo'lsa va qidiruv bo'lmasa.
  // Bitta yo'nalish bo'lsa testlar to'g'ridan-to'g'ri ochiladi (ortiqcha bosish shart emas).
  const showFacultyList = Boolean(
    selectedUniversity && !searchQuery.trim() && facultyGroups.length > 1 && !activeFaculty
  );

  // Ekranda ko'rinadigan testlar: yo'nalish tanlangan bo'lsa faqat o'sha yo'nalish
  const visibleUniTests = useMemo(() => {
    if (!activeFaculty || searchQuery.trim()) return testsForSelectedUni;
    return testsForSelectedUni.filter((pkg) => facultyKey(getPackageFaculty(pkg)) === activeFaculty.key);
  }, [testsForSelectedUni, activeFaculty, searchQuery]);

  // Telegram "Orqaga" tugmasi: avval yo'nalishdan, keyin universitetdan chiqadi
  useTelegramBackButton(
    !onlyMyTests && selectedUniversity
      ? () => {
          triggerHaptic('light');
          if (activeFaculty && facultyGroups.length > 1) setSelectedFaculty(null);
          else setSelectedUniversity(null);
        }
      : null,
    1
  );

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

  const listCard = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const listRow =
    'w-full flex items-center gap-3 px-4 min-h-[64px] text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800/60';
  const emptyState = (title: string, desc: string, icon: React.ReactNode, withCreate = true) => (
    <div className={`${listCard} px-6 py-10 text-center`}>
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{desc}</p>
      {withCreate && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenCreateModal();
          }}
          className="mt-5 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[14px] transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>{t.createTestBtn}</span>
        </button>
      )}
    </div>
  );

  const renderTestCard = (pkg: TestPackage) => {
    const meta = [
      pkg.department ? decodeHtmlEntities(pkg.department) : '',
      pkg.course_year ? tr(`${pkg.course_year}-kurs`, `${pkg.course_year}-й курс`, `Year ${pkg.course_year}`) : '',
      pkg.semester ? tr(`${pkg.semester}-semestr`, `${pkg.semester}-й семестр`, `Semester ${pkg.semester}`) : '',
      `${pkg.totalQuestions} ${t.questionsCount}`,
    ].filter(Boolean);

    return (
      <article key={pkg.id} className={`${listCard} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
              {decodeHtmlEntities(pkg.title)}
            </h3>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{meta.join(' · ')}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              {!pkg.isPublic && (
                <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {t.privateAccess}
                </span>
              )}
              {isUserAuthor(pkg) ? (
                <span className="font-medium text-emerald-700 dark:text-emerald-300">{t.myTestBadge}</span>
              ) : (
                pkg.authorName && (
                  <span className="truncate">
                    {t.authorLabel}: {decodeHtmlEntities(pkg.authorName)}
                  </span>
                )
              )}
            </div>
          </div>

          {(isAdmin || isUserAuthor(pkg)) && (
            <div className="flex items-center -mr-2 -mt-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setAdminEditingQuiz(pkg);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                aria-label={tr('Testni tahrirlash', 'Редактировать тест', 'Edit test')}
              >
                <Edit3 className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTest(pkg);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-orange-600 dark:text-orange-400 active:bg-orange-50 dark:active:bg-orange-950"
                aria-label={tr("Testni o'chirish", 'Удалить тест', 'Delete test')}
              >
                <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>

        {/* Bloklar */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(pkg.blocks || []).map((block, idx) => {
            const isPaid = isPaidUser(profile);
            const unlocked = isUserAuthor(pkg) || isAdmin || isBlockUnlocked(pkg, idx, testAttempts);
            const isLocked = !unlocked;

            const blockAttempts = (testAttempts || []).filter(
              (a) => a.testPackageId === pkg.id && (a.blockId === block.id || a.blockTitle === block.title)
            );
            const qTotal = block.questions?.length || 0;
            const passing = block.passingScore || Math.max(1, Math.ceil((qTotal || 25) * 0.7));
            const maxScore =
              blockAttempts.length > 0 ? Math.max(...blockAttempts.map((a) => a.score)) : block.bestScore || 0;
            const isPassed = Boolean(
              block.isPassed || maxScore >= passing || blockAttempts.some((a) => a.isPassed || a.score >= passing)
            );
            const todayAttempts = !isPaid ? getTodayAttemptsCount(pkg.id, block.id, testAttempts) : 0;
            const isLimitReached = !isPaid && todayAttempts >= DAILY_FREE_TEST_LIMIT;

            let status: React.ReactNode;
            if (isLocked) status = <span className="text-slate-400 dark:text-slate-500">{t.lockedStatus}</span>;
            else if (isLimitReached)
              status = <span className="text-orange-600 dark:text-orange-400 font-medium">{tr('Bugungi limit tugadi', 'Лимит на сегодня исчерпан', "Today's limit reached")}</span>;
            else if (maxScore > 0)
              status = (
                <span className={isPassed ? 'text-emerald-700 dark:text-emerald-300 font-medium' : ''}>
                  {tr('Natija', 'Результат', 'Score')}: {maxScore}/{qTotal}
                </span>
              );
            else status = <span>{qTotal} {t.questionsCount}</span>;

            return (
              <button
                key={block.id}
                type="button"
                onClick={() => handleTestClick(pkg, block)}
                aria-label={`${localizeBlockTitle(decodeHtmlEntities(block.title))}${isLocked ? `, ${t.lockedStatus}` : ''}`}
                className={`min-h-[64px] px-3 py-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-colors ${
 isLocked
 ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
 : isPassed
 ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 active:bg-emerald-100 dark:active:bg-emerald-900'
 : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-800'
 }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[14px] font-semibold ${
 isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-50'
 }`}
                  >
                    {localizeBlockTitle(decodeHtmlEntities(block.title))}
                  </span>
                  {isLocked || isLimitReached ? (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
                  ) : isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
                  )}
                </span>
                <span className="text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">{status}</span>
              </button>
            );
          })}
        </div>
      </article>
    );
  };

  const inUniScope = !onlyMyTests && Boolean(selectedUniversity);
  const backToFaculties = Boolean(activeFaculty && facultyGroups.length > 1 && !searchQuery.trim());

  return (
    <div className="space-y-4 pb-20">
      {/* Sarlavha */}
      {inUniScope ? (
        <div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (backToFaculties) setSelectedFaculty(null);
              else setSelectedUniversity(null);
            }}
            className="-ml-2 min-h-[40px] px-2 inline-flex items-center gap-1 text-[14px] font-medium text-emerald-700 dark:text-emerald-300"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            <span>
              {backToFaculties
                ? tr("Yo'nalishlar", 'Направления', 'Faculties')
                : tr('Barcha OTMlar', 'Все вузы', 'All universities')}
            </span>
          </button>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-50">
            {decodeHtmlEntities(selectedUniversity || '')}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            {activeFaculty && !searchQuery.trim()
              ? `${activeFaculty.name === OTHER_FACULTY ? tr("Boshqa yo'nalish", 'Другое направление', 'Other faculty') : activeFaculty.name} · ${visibleUniTests.length} ${tr('ta test', 'тестов', 'tests')}`
              : showFacultyList
              ? `${tr("Yo'nalishni tanlang", 'Выберите направление', 'Choose a faculty')} · ${facultyGroups.length}`
              : `${visibleUniTests.length} ${tr('ta test', 'тестов', 'tests')}`}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-50">{t.navTests}</h2>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{tr('OTMni tanlang, keyin fanni', 'Выберите вуз, затем предмет', 'Choose a university, then a subject')}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                triggerHaptic('light');
                await handleSyncTests();
                triggerHaptic('success');
              }}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-200/70 dark:active:bg-slate-800"
              aria-label={tr('Testlarni yangilash', 'Обновить тесты', 'Refresh tests')}
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenCreateModal();
              }}
              className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span>{t.createTestBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tarmoq xatosi */}
      {syncError && (
        <div role="alert" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-100">
          <span className="flex-1 text-[13px]">{t.networkErrorNotice}</span>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => {
              triggerHaptic('light');
              handleSyncTests();
            }}
            className="shrink-0 min-h-[36px] px-3 rounded-lg bg-amber-900 dark:bg-amber-200 text-white dark:text-amber-950 font-semibold text-[13px] inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            <span>{t.retryBtn}</span>
          </button>
        </div>
      )}

      {/* Barcha testlar / Mening testlarim */}
      {!inUniScope && (
        <div role="tablist" className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800">
          {[
            { mine: false, label: `${t.allTestsTab} (${testPackages.length})` },
            { mine: true, label: `${t.myTestsTab} (${myTestsCount})` },
          ].map((tab) => {
            const active = onlyMyTests === tab.mine;
            return (
              <button
                key={String(tab.mine)}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  triggerHaptic('selection');
                  setOnlyMyTests(tab.mine);
                }}
                className={`min-h-[40px] rounded-lg text-[13px] font-semibold transition-colors ${
 active
 ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 shadow-[0_1px_2px_rgba(28,25,23,0.08)]'
 : 'text-slate-500 dark:text-slate-400'
 }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Qidiruv */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" strokeWidth={1.75} />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            selectedUniversity
              ? tr("Fan yoki yo'nalishni qidiring", 'Поиск предмета или направления', 'Search subject or faculty')
              : tr('OTM yoki fan nomini qidiring', 'Поиск вуза или предмета', 'Search university or subject')
          }
          aria-label={tr('Qidirish', 'Поиск', 'Search')}
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[15px] text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
        />
      </div>

      {onlyMyTests ? (
        <div className="space-y-3">
          {myTestPackages.length === 0
            ? emptyState(t.myTestsEmptyTitle, t.myTestsEmptyDesc, <BookOpen className="w-6 h-6" strokeWidth={1.75} />)
            : myTestPackages.map((pkg) => renderTestCard(pkg))}
        </div>
      ) : !selectedUniversity ? (
        <div className="space-y-4">
          {searchQuery.trim() && matchingSearchTests.length > 0 && (
            <div className="space-y-3">
              <p className="px-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {tr('Topilgan testlar', 'Найдено тестов', 'Tests found')}: {matchingSearchTests.length}
              </p>
              {matchingSearchTests.map((pkg) => renderTestCard(pkg))}
            </div>
          )}

          {universityCatalog.length === 0 && matchingSearchTests.length === 0 ? (
            emptyState(
              searchQuery.trim()
                ? tr('Hech narsa topilmadi', 'Ничего не найдено', 'Nothing found')
                : tr("Hozircha testlar yo'q", 'Пока нет тестов', 'No tests yet'),
              searchQuery.trim()
                ? tr("Boshqa so'z bilan qidirib ko'ring.", 'Попробуйте другой запрос.', 'Try a different search.')
                : tr("Birinchi bo'lib o'z testingizni qo'shing.", 'Добавьте свой тест первым.', 'Be the first to add a test.'),
              <School className="w-6 h-6" strokeWidth={1.75} />,
              !searchQuery.trim()
            )
          ) : (
            universityCatalog.length > 0 && (
              <div className="space-y-2">
                {searchQuery.trim() && matchingSearchTests.length > 0 && (
                  <p className="px-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    {tr('OTMlar', 'Вузы', 'Universities')}: {universityCatalog.length}
                  </p>
                )}
                <div className={`${listCard} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
                  {universityCatalog.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedUniversity(item.name);
                      }}
                      className={listRow}
                    >
                      <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[12px] font-bold tracking-[0.02em] shrink-0">
                        {item.monogram}
                      </span>
                      <span className="min-w-0 flex-1 py-3">
                        <span className="block text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
                          {decodeHtmlEntities(item.name)}
                        </span>
                        <span className="block mt-0.5 text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {item.testCount} {tr('ta test', 'тестов', 'tests')}
                        </span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {testsForSelectedUni.length === 0 ? (
            emptyState(
              tr('Bu OTMda testlar topilmadi', 'В этом вузе тестов нет', 'No tests for this university'),
              tr("Qidiruv so'zini o'zgartiring yoki shu OTM uchun test qo'shing.", 'Измените запрос или добавьте тест для этого вуза.', 'Change the search or add a test for this university.'),
              <BookOpen className="w-6 h-6" strokeWidth={1.75} />
            )
          ) : showFacultyList ? (
            <div className={`${listCard} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
              {facultyGroups.map((g) => (
                <button
                  type="button"
                  key={g.key}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedFaculty(g.key);
                  }}
                  className={listRow}
                >
                  <GraduationCap className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 py-3">
                    <span className="block text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
                      {g.name === OTHER_FACULTY ? tr("Boshqa yo'nalish", 'Другое направление', 'Other faculty') : g.name}
                    </span>
                    <span className="block mt-0.5 text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {g.testCount} {tr('ta test', 'тестов', 'tests')}
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          ) : (
            visibleUniTests.map((pkg) => renderTestCard(pkg))
          )}
        </div>
      )}

      {/* Lock Explanation Modal */}
      {lockExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-lg border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
              {localizeBlockTitle(lockExplanation.blockTitle)} ({t.lockedStatus})
            </h3>

            <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {lockExplanation.message}
            </p>

            <button
              onClick={() => setLockExplanation(null)}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] transition-colors"
            >
              {t.understandBtn}
            </button>
          </div>
        </div>
      )}

      {/* Private Test Password Modal: prompts exact text required */}
      {passwordModalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
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
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-lg border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7" strokeWidth={1.75} />
            </div>

            <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
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
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
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
