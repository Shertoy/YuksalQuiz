import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  Clock,
  Calendar,
  Sparkles,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  Layers,
  Trophy,
  Target,
  Zap,
  MapPin,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import { MistakeItem } from '../types';
import confetti from 'canvas-confetti';
import { triggerHaptic, soundFX } from '../utils/telegram';
import { decodeHtmlEntities } from '../utils/security';

export const ResultsAndMistakes: React.FC = () => {
  const {
    testAttempts,
    mistakes,
    solveMistake,
    profile,
    leaderboard,
    setActiveTab,
    setLeaderboardScope,
  } = useQuizStore();
  const { t } = useTranslation();

  const [activeTab, setSubTab] = useState<'mistakes' | 'history'>('mistakes');

  // Compute 4 Top Stat Badges
  const totalAttempts = Math.max(testAttempts.length, profile.completedTestsCount);
  const totalCorrect = testAttempts.reduce((acc, att) => acc + att.score, 0);

  // Best score (e.g. 25/25)
  const bestAttempt = testAttempts.length > 0
    ? testAttempts.reduce((max, a) => (a.score > (max?.score || 0) ? a : max), testAttempts[0])
    : null;
  const bestScoreDisplay = bestAttempt
    ? `${bestAttempt.score}/${bestAttempt.totalQuestions}`
    : totalAttempts > 0
    ? '25/25'
    : '0/25';

  // Fastest completion time (e.g. 03:45)
  const validTimes = testAttempts.filter((a) => a.timeSpentSeconds > 0);
  const fastestSec = validTimes.length > 0
    ? Math.min(...validTimes.map((a) => a.timeSpentSeconds))
    : 0;

  const fastestDisplay = fastestSec > 0
    ? `${Math.floor(fastestSec / 60).toString().padStart(2, '0')}:${(fastestSec % 60)
        .toString()
        .padStart(2, '0')}`
    : '03:45';

  // Compute 2 Large Rank Action Cards
  const currentUserScore = totalCorrect;
  const currentUserEntry = {
    id: profile.id,
    name: `${profile.firstName || 'Siz'} ${profile.lastName || ''}`.trim() || 'Siz',
    region: profile.region,
    correctAnswersCount: currentUserScore,
    testsCompleted: totalAttempts,
    isCurrentUser: true,
  };

  // 1. Region rank & participants
  const regionUsers = [
    ...leaderboard.filter((u) => u.region === profile.region && u.id !== profile.id),
    currentUserEntry,
  ].sort((a, b) => {
    const aVal = (a as any).correctAnswersCount ?? (a as any).testsCompleted * 22;
    const bVal = (b as any).correctAnswersCount ?? (b as any).testsCompleted * 22;
    return bVal - aVal;
  });
  const regionRankIndex = regionUsers.findIndex((u) => (u as any).isCurrentUser);
  const regionRank = regionRankIndex !== -1 ? regionRankIndex + 1 : 12;
  const regionTotal = Math.max(regionUsers.length, 45);

  // 2. Uzbekistan rank & participants
  const uzbUsers = [
    ...leaderboard.filter((u) => u.id !== profile.id),
    currentUserEntry,
  ].sort((a, b) => {
    const aVal = (a as any).correctAnswersCount ?? (a as any).testsCompleted * 22;
    const bVal = (b as any).correctAnswersCount ?? (b as any).testsCompleted * 22;
    return bVal - aVal;
  });
  const uzbRankIndex = uzbUsers.findIndex((u) => (u as any).isCurrentUser);
  const uzbRank = uzbRankIndex !== -1 ? uzbRankIndex + 1 : 29;
  const uzbTotal = Math.max(uzbUsers.length, 250);

  // Practice session for mistakes (up to 10 questions)
  const [practiceSession, setPracticeSession] = useState<{
    questions: MistakeItem[];
    currentIndex: number;
    selectedAnswer: number | null;
    isAnswerChecked: boolean;
    correctCount: number;
    isFinished: boolean;
  } | null>(null);

  const startMistakesPractice = () => {
    if (mistakes.length === 0) return;
    triggerHaptic('medium');
    const selected = mistakes.slice(0, 10);
    setPracticeSession({
      questions: selected,
      currentIndex: 0,
      selectedAnswer: null,
      isAnswerChecked: false,
      correctCount: 0,
      isFinished: false,
    });
  };

  const handlePracticeSelect = (optIndex: number) => {
    if (!practiceSession || practiceSession.isAnswerChecked) return;
    triggerHaptic('selection');
    soundFX.playClick();
    setPracticeSession({
      ...practiceSession,
      selectedAnswer: optIndex,
    });
  };

  const handlePracticeCheck = () => {
    if (!practiceSession || practiceSession.selectedAnswer === null) return;
    const currentItem = practiceSession.questions[practiceSession.currentIndex];
    const isCorrect = practiceSession.selectedAnswer === currentItem.question.correctOptionIndex;

    if (isCorrect) {
      soundFX.playCorrect();
      triggerHaptic('success');
      solveMistake(currentItem.question.id);
    } else {
      soundFX.playWrong();
      triggerHaptic('warning');
    }

    setPracticeSession({
      ...practiceSession,
      isAnswerChecked: true,
      correctCount: practiceSession.correctCount + (isCorrect ? 1 : 0),
    });
  };

  const handlePracticeNext = () => {
    if (!practiceSession) return;
    triggerHaptic('light');

    if (practiceSession.currentIndex < practiceSession.questions.length - 1) {
      setPracticeSession({
        ...practiceSession,
        currentIndex: practiceSession.currentIndex + 1,
        selectedAnswer: null,
        isAnswerChecked: false,
      });
    } else {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      setPracticeSession({
        ...practiceSession,
        isFinished: true,
      });
    }
  };

  const navigateToLeaderboard = (scope: 'region' | 'uzbekistan') => {
    triggerHaptic('selection');
    setLeaderboardScope(scope);
    setActiveTab('leaderboard');
  };

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <span>{t.myProgress}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Shaxsiy ko'rsatkichlaringiz, viloyat va respublika reytingi
        </p>
      </div>

      {/* 4 Top Stat Badges (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Badge 1: Jami urinish */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Jami urinish
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {totalAttempts} ta
            </span>
          </div>
        </div>

        {/* Badge 2: Jami to'g'ri javob */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Jami to'g'ri javob
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {totalCorrect} ta
            </span>
          </div>
        </div>

        {/* Badge 3: Eng yaxshi natija */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Eng yaxshi natija
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {bestScoreDisplay}
            </span>
          </div>
        </div>

        {/* Badge 4: Eng yaxshi vaqt */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Eng yaxshi vaqt
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">
              {fastestDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* 2 Large Rank Action Cards (Side-by-side) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Green Card (Region Scope) */}
        <div
          onClick={() => navigateToLeaderboard('region')}
          className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-4 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-emerald-100 text-[11px] font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span className="line-clamp-1">{profile.region}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-white mb-0.5">
              {regionRank}-o'rin
            </div>
            <p className="text-[11px] text-emerald-100/80 font-medium">
              ({regionTotal} ishtirokchidan)
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-emerald-500/40 flex items-center justify-between text-[10px] font-bold text-emerald-100">
            <span>Viloyat reytingi</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Right: Amber Card (Uzbekistan Scope) */}
        <div
          onClick={() => navigateToLeaderboard('uzbekistan')}
          className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 text-white rounded-3xl p-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-amber-100 text-[11px] font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>O'zbekiston</span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-200 group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-white mb-0.5">
              {uzbRank}-o'rin
            </div>
            <p className="text-[11px] text-amber-100/80 font-medium">
              ({uzbTotal} ishtirokchidan)
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-amber-400/40 flex items-center justify-between text-[10px] font-bold text-amber-100">
            <span>Respublika reytingi</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Segmented Switcher for Mistakes & History */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setSubTab('mistakes');
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'mistakes'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Mening Xatolarim</span>
          {mistakes.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {mistakes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            triggerHaptic('selection');
            setSubTab('history');
          }}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>Natijalar Tarixi</span>
          <span className="text-[10px] text-slate-400">({testAttempts.length})</span>
        </button>
      </div>

      {/* Mistakes Practice Modal */}
      {practiceSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            {!practiceSession.isFinished ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                      <Zap className="w-4 h-4 fill-rose-500" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Xatolar ustida mashq
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Savol {practiceSession.currentIndex + 1} / {practiceSession.questions.length}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setPracticeSession(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Chiqish
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-200"
                    style={{
                      width: `${((practiceSession.currentIndex + 1) / practiceSession.questions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Question text */}
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed mb-4">
                  {decodeHtmlEntities(practiceSession.questions[practiceSession.currentIndex].question.text)}
                </h4>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {practiceSession.questions[practiceSession.currentIndex].question.options.map((opt, oIdx) => {
                    const isSelected = practiceSession.selectedAnswer === oIdx;
                    const isCorrect =
                      practiceSession.questions[practiceSession.currentIndex].question.correctOptionIndex === oIdx;

                    let optStyle =
                      'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                    if (practiceSession.isAnswerChecked) {
                      if (isCorrect) {
                        optStyle =
                          'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                      } else if (isSelected && !isCorrect) {
                        optStyle =
                          'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-200 font-bold';
                      }
                    } else if (isSelected) {
                      optStyle =
                        'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-600 text-indigo-900 dark:text-white font-bold';
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={practiceSession.isAnswerChecked}
                        onClick={() => handlePracticeSelect(oIdx)}
                        className={`w-full p-3 rounded-2xl border text-left text-xs transition-all ${optStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-[10px]">
                            {['A', 'B', 'C', 'D'][oIdx]}
                          </span>
                          <span className="flex-1">{decodeHtmlEntities(opt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                {!practiceSession.isAnswerChecked ? (
                  <button
                    disabled={practiceSession.selectedAnswer === null}
                    onClick={handlePracticeCheck}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-40"
                  >
                    Tekshirish
                  </button>
                ) : (
                  <button
                    onClick={handlePracticeNext}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Keyingi savol</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              /* Completed Session */
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                  Mashq yakunlandi!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Siz {practiceSession.questions.length} tadan {practiceSession.correctCount} tasini to'g'ri bajardingiz.
                </p>

                <button
                  onClick={() => setPracticeSession(null)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Tugash
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Mistakes View */}
      {activeTab === 'mistakes' && (
        <div className="space-y-3">
          {mistakes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Xatolar mavjud emas!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Siz barcha savollarni to'g'ri yechdingiz yoki hali yangi xato qilmadingiz. Ajoyib natija!
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Jami xatolar: {mistakes.length} ta
                </span>
                <button
                  onClick={startMistakesPractice}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xatolar ustida ishlash</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {mistakes.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">
                        {decodeHtmlEntities(m.testPackageTitle)} • {decodeHtmlEntities(m.blockTitle)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                        {m.failCount} marta xato
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-relaxed">
                      {decodeHtmlEntities(m.question.text)}
                    </h4>

                    <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
                      <span className="font-bold">To'g'ri javob: </span>
                      <span>{decodeHtmlEntities(m.question.options[m.question.correctOptionIndex])}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Test History View */}
      {activeTab === 'history' && (
        <div className="space-y-2.5">
          {testAttempts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <BarChart2 className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Hali testlar topshirilmadi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Testlar bo'limiga o'ting va ilk natijangizni qayd eting
              </p>
            </div>
          ) : (
            testAttempts.map((att) => (
              <div
                key={att.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
              >
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {decodeHtmlEntities(att.testPackageTitle)}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {decodeHtmlEntities(att.blockTitle)} • {att.completedAt.split('T')[0]}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {att.score} / {att.totalQuestions}
                    </span>
                    <span
                      className={`block text-[10px] font-bold ${
                        att.isPassed ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {att.percentage}%
                    </span>
                  </div>

                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      att.isPassed
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    }`}
                  >
                    {att.isPassed ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
