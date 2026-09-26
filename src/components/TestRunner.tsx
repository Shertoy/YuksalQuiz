import React, { useState, useEffect, useRef } from 'react';
import { TestPackage, UserAnswerRecord, TestAttempt } from '../types';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { Clock, CheckCircle2, X, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic, soundFX } from '../utils/telegram';

interface TestRunnerProps {
  testPackage: TestPackage;
  blockId: string;
  onFinish: (attempt: TestAttempt, unlockedNext: boolean, nextBlockTitle?: string) => void;
  onCancel: () => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({
  testPackage,
  blockId,
  onFinish,
  onCancel,
}) => {
  const { recordTestAttempt } = useQuizStore();
  const { t } = useTranslation();

  const block = testPackage.blocks.find((b) => b.id === blockId) || testPackage.blocks[0];
  const questions = block.questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wrongShakeIndex, setWrongShakeIndex] = useState<number | null>(null);

  // Global uninterrupted countdown timer (60s per question, min 180s)
  const totalTestDuration = Math.max(180, questions.length * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(totalTestDuration);
  const [totalSecondsSpent, setTotalSecondsSpent] = useState(0);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const selectedAnswersRef = useRef(selectedAnswers);
  selectedAnswersRef.current = selectedAnswers;
  const isFinishedRef = useRef(false);

  const currentQ = questions[currentIndex];
  const currentAnswer = selectedAnswers[currentIndex];

  // Finish test logic
  const finishTestWithAnswers = (finalAnswers: Record<number, number>, timeSpent: number) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    let score = 0;
    const userAnswers: UserAnswerRecord[] = questions.map((q, idx) => {
      const selected = finalAnswers[idx] !== undefined ? finalAnswers[idx] : -1;
      const isCorrect = selected === q.correctOptionIndex;
      if (isCorrect) score += 1;

      return {
        questionId: q.id,
        questionText: q.text,
        options: q.options,
        selectedOption: selected,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const isPassed = score >= block.passingScore;
    const nextBlock = testPackage.blocks.find((b) => b.blockNumber === block.blockNumber + 1);

    const attempt: TestAttempt = {
      id: 'att-' + Math.random().toString(36).substring(2, 9),
      testPackageId: testPackage.id,
      testPackageTitle: testPackage.title,
      university: testPackage.university,
      department: testPackage.department,
      blockId: block.id,
      blockTitle: block.title,
      score,
      totalQuestions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      timeSpentSeconds: timeSpent,
      completedAt: new Date().toISOString(),
      isPassed,
      userAnswers,
    };

    const { unlockedNext } = recordTestAttempt(attempt);
    onFinish(attempt, unlockedNext, nextBlock?.title);
  };

  // Continuous uninterrupted global countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSecondsSpent((spent) => spent + 1);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTestWithAnswers(selectedAnswersRef.current, totalTestDuration);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions.length, totalTestDuration]);

  // Option selection with instant feedback + 700ms pause + auto-advance
  const handleSelectOption = (optIndex: number) => {
    if (isTransitioning || selectedAnswers[currentIndex] !== undefined) return;

    setIsTransitioning(true);
    const updatedAnswers = {
      ...selectedAnswers,
      [currentIndex]: optIndex,
    };
    setSelectedAnswers(updatedAnswers);

    const isCorrect = optIndex === currentQ.correctOptionIndex;
    if (isCorrect) {
      soundFX.playCorrect();
      triggerHaptic('success');
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.75 },
      });
    } else {
      soundFX.playWrong();
      triggerHaptic('warning');
      setWrongShakeIndex(optIndex);
    }

    // 700ms pause, then one-way advance or finish
    setTimeout(() => {
      setWrongShakeIndex(null);
      setIsTransitioning(false);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        finishTestWithAnswers(updatedAnswers, totalSecondsSpent);
      }
    }, 700);
  };

  // Format timer
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercentage = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] pb-6 animate-in fade-in select-none">
      {/* Test Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmCancel(true)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                {testPackage.title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {block.title}
              </p>
            </div>
          </div>

          {/* Uninterrupted Global Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors ${
              secondsRemaining < 30
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse'
                : secondsRemaining < 60
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Thin Top Progress Bar + Compact Counter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span>
              {t.questionNumber}: {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
              {progressPercentage}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex-1 flex flex-col justify-between">
        <div>
          <div className="inline-block px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] mb-3">
            {t.questionNumber} #{currentIndex + 1}
          </div>

          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed mb-6">
            {currentQ.text}
          </h3>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, optIdx) => {
              const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
              const isSelected = currentAnswer === optIdx;
              const isCorrectAnswer = currentQ.correctOptionIndex === optIdx;
              const isShaking = wrongShakeIndex === optIdx;

              // Interactive styling during feedback
              let cardStyle = 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700';
              let badgeStyle = 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600';

              if (currentAnswer !== undefined) {
                if (isSelected && isCorrectAnswer) {
                  // User selected correct answer
                  cardStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold shadow-sm';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                } else if (isSelected && !isCorrectAnswer) {
                  // User selected wrong answer
                  cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-100 font-bold';
                  badgeStyle = 'bg-rose-600 text-white border-rose-600';
                } else if (!isSelected && isCorrectAnswer) {
                  // Reveal correct answer when user was wrong
                  cardStyle = 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-200 border-dashed';
                  badgeStyle = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400';
                } else {
                  cardStyle = 'opacity-40 bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-400';
                }
              }

              return (
                <button
                  key={optIdx}
                  disabled={isTransitioning || currentAnswer !== undefined}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center gap-3 transition-all duration-150 active:scale-[0.99] ${
                    isShaking ? 'animate-wrong-shake' : ''
                  } ${cardStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${badgeStyle}`}
                  >
                    {letters[optIdx] || optIdx + 1}
                  </span>
                  <span className="leading-relaxed flex-1">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Skip Action (Strictly forward progression) */}
        {currentAnswer === undefined && (
          <div className="flex justify-end pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                triggerHaptic('light');
                if (currentIndex < questions.length - 1) {
                  setCurrentIndex((idx) => idx + 1);
                } else {
                  finishTestWithAnswers(selectedAnswers, totalSecondsSpent);
                }
              }}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors px-3 py-2 rounded-xl"
            >
              <span>{currentIndex < questions.length - 1 ? t.nextBtn : t.finishTest}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Confirm Exit Modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <X className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
              Testni tark etasizmi?
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Joriy natijalar saqlanmaydi va test bekor qilinadi.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Davom etish
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
