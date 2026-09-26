import React, { useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { MistakeItem } from '../types';
import confetti from 'canvas-confetti';
import { triggerHaptic, soundFX } from '../utils/telegram';

export const ResultsAndMistakes: React.FC = () => {
  const { testAttempts, mistakes, solveMistake } = useQuizStore();
  const [activeTab, setActiveTab] = useState<'mistakes' | 'history'>('mistakes');

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
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
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

  return (
    <div className="space-y-4 pb-20 animate-in fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          Natijalar va Xatolar
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Xatolaringiz ustida ishlang va o'zlashtirish darajangizni oshiring
        </p>
      </div>

      {/* Segmented Switcher */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setActiveTab('mistakes');
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
            setActiveTab('history');
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

      {/* Mistakes Practice Modal / View */}
      {practiceSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            {!practiceSession.isFinished ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                      ⚡
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

                {/* Question */}
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed mb-4">
                  {practiceSession.questions[practiceSession.currentIndex].question.text}
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
                        className={`w-full p-3 rounded-2xl border text-left text-xs flex items-center justify-between transition-all ${optStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200 dark:border-slate-600">
                            {['A', 'B', 'C', 'D'][oIdx]}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {practiceSession.isAnswerChecked && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {practiceSession.isAnswerChecked && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {practiceSession.isAnswerChecked &&
                  practiceSession.questions[practiceSession.currentIndex].question.explanation && (
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-[11px] text-indigo-900 dark:text-indigo-200 mb-4">
                      <span className="font-bold">Izoh: </span>
                      {practiceSession.questions[practiceSession.currentIndex].question.explanation}
                    </div>
                  )}

                {/* Action button */}
                {!practiceSession.isAnswerChecked ? (
                  <button
                    disabled={practiceSession.selectedAnswer === null}
                    onClick={handlePracticeCheck}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all active:scale-95"
                  >
                    Tekshirish
                  </button>
                ) : (
                  <button
                    onClick={handlePracticeNext}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {practiceSession.currentIndex < practiceSession.questions.length - 1
                        ? 'Keyingi savol'
                        : 'Natijani ko\'rish'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              /* Finished practice modal */
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mb-4">
                  🎯
                </div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white mb-1">
                  Mashg'ulot yakunlandi!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Siz {practiceSession.questions.length} ta xatodan {practiceSession.correctCount} tasini to'g'ri ishlab, o'zlashtirdingiz!
                </p>
                <button
                  onClick={() => setPracticeSession(null)}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20"
                >
                  Xatolar ro'yxatiga qaytish
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Mening Xatolarim */}
      {activeTab === 'mistakes' ? (
        <div className="space-y-3">
          {mistakes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center text-3xl mb-3">
                ✨
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Sizda hali xatolar yo'q!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Test yechish davomida xato qilingan savollar avtomatik ravishda bu yerga tushadi va qayta mashq qilish imkoni yaratiladi.
              </p>
            </div>
          ) : (
            <>
              {/* Practice 10 mistakes banner */}
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-3xl p-4 shadow-lg shadow-rose-500/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Xatolar ustida ishlash</span>
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    {Math.min(10, mistakes.length)} ta savolli maxsus mashqni boshlang
                  </p>
                </div>
                <button
                  onClick={startMistakesPractice}
                  className="px-4 py-2 rounded-xl bg-white text-rose-600 font-bold text-xs shadow-md shrink-0 transition-transform active:scale-95"
                >
                  Boshlash
                </button>
              </div>

              {/* Mistakes List */}
              <div className="space-y-2.5">
                {mistakes.map((m, idx) => (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/70 px-2 py-0.5 rounded-md">
                        {m.testPackageTitle} • {m.blockTitle}
                      </span>
                      <span>{m.failCount} marta xato</span>
                    </div>

                    <p className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                      {m.question.text}
                    </p>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        To'g'ri javob: {m.question.options[m.question.correctOptionIndex]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Tab: Natijalar Tarixi */
        <div className="space-y-2.5">
          {testAttempts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Hali hech qanday test yechilmagan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Testlar bo'limiga o'ting va birinchi testingizni bajaring
              </p>
            </div>
          ) : (
            testAttempts.map((att) => (
              <div
                key={att.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        att.isPassed
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {att.isPassed ? 'O\'tildi' : 'Yetarli emas'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {att.completedAt.split('T')[0]}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                    {att.testPackageTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {att.blockTitle} • {att.university}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                    {att.score} / {att.totalQuestions}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    {att.percentage}% ({Math.round(att.timeSpentSeconds / 60)} daq)
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
