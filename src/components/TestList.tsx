import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Plus,
  KeyRound,
  GraduationCap,
  Building2,
  Globe2,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import {
  MAIN_CATEGORIES,
  MainCategory,
  TestPackage,
  TestBlock,
} from '../types';
import { triggerHaptic } from '../utils/telegram';
import { getUnlockRequirementsMessage } from '../utils/testSplitter';

interface TestListProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
}

export const TestList: React.FC<TestListProps> = ({ onStartTest, onOpenCreateModal }) => {
  const { testPackages } = useQuizStore();

  const [activeCategory, setActiveCategory] = useState<MainCategory>('Oliy Ta\'lim (HEMIS)');
  const [searchQuery, setSearchQuery] = useState('');
  const [passwordModalPkg, setPasswordModalPkg] = useState<TestPackage | null>(null);
  const [targetBlockId, setTargetBlockId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Lock explanation modal state (sequential block lock)
  const [lockExplanation, setLockExplanation] = useState<{
    blockTitle: string;
    prevBlockTitle: string;
    message: string;
  } | null>(null);

  // Filter test packages by active category and search query
  const filteredPackages = testPackages.filter((pkg) => {
    const pkgCategory = pkg.category || 'Oliy Ta\'lim (HEMIS)';
    const matchesCategory = pkgCategory === activeCategory;
    const matchesSearch =
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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

    if (passwordInput.trim() === passwordModalPkg.password) {
      triggerHaptic('success');
      const pkg = passwordModalPkg;
      const bId = targetBlockId;
      setPasswordModalPkg(null);
      onStartTest(pkg, bId);
    } else {
      triggerHaptic('error');
      setPasswordError('Noto\'g\'ri parol kiritildi. Qaytadan urinib ko\'ring.');
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in">
      {/* Header & Create Test Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Testlar Bo'limi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Yo'nalishingiz bo'yicha tayyorgarlik ko'ring
          </p>
        </div>
        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenCreateModal();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Test tuzish</span>
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
              <span>{cat}</span>
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
          placeholder={`${activeCategory} bo'yicha qidirish...`}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-medium"
        />
      </div>

      {/* Tests Grid */}
      <div className="space-y-3">
        {filteredPackages.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Ushbu bo'limda test topilmadi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Boshqa so'z bilan qidirib ko'ring yoki o'zingiz yangi test qo'shing
            </p>
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
                      {pkg.department}
                    </span>

                    {!pkg.isPublic ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                        <Lock className="w-3 h-3" />
                        <span>Parolli (Locked)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        <span>Ochiq</span>
                      </span>
                    )}

                    {pkg.isCommunityCreated && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                        +100 so'm muallifga
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {pkg.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {pkg.university} • Muallif: {pkg.authorName}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-slate-400">
                    {pkg.totalQuestions} savol
                  </span>
                </div>
              </div>

              {/* Sequential Test Blocks Selection */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                        className={`p-2.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
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
                            <span>{block.title}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Maxfiy Test Paroli
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {passwordModalPkg.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Ushbu testga kirish uchun maxsus parolni kiriting (masalan: TGFU2026).
            </p>

            {passwordError && (
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-3">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Parolni kiriting (masalan: TGFU2026)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModalPkg(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
                >
                  Testga kirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
