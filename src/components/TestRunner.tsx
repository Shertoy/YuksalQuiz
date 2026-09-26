import React, { useState, useEffect, useRef } from 'react';
import { TestPackage, TestBlock, UserAnswerRecord, TestAttempt } from '../types';
import { useQuizStore } from '../store/useQuizStore';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, X, Sparkles } from 'lucide-react';
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

  const block = testPackage.blocks.find((b) => b.id === blockId) || testPackage.blocks[0];
  const questions = block.questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(120); // 2 minutes per question
  const [totalSecondsSpent, setTotalSecondsSpent] = useState(0);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [wrongShakeIndex, setWrongShakeIndex] = useState<number | null>(null);

  const currentQ = questions[currentIndex];
  const currentAnswer = selectedAnswers[currentIndex];

  // Timer: 2 minutes (120s) countdown per question
  useEffect(() => {
    setSecondsRemaining(120);
  }, [currentIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Time expired for this question, auto move to next or stay
          if (currentIndex < questions.length - 1) {
            setCurrentIndex((idx) => idx + 1);
          }
          return 120;
        }
        return prev - 1;
      });
      setTotalSecondsSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, questions.length]);

  // Option selection
  const handleSelectOption = (optIndex: number) => {
    triggerHaptic('selection');
    soundFX.playClick();

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIndex,
    }));

    // Interactive immediate feedback
    const isCorrect = optIndex === currentQ.correctOptionIndex;
    if (isCorrect) {
      soundFX.playCorrect();
      triggerHaptic('success');
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
      });
    } else {
      soundFX.playWrong();
      triggerHaptic('warning');
      setWrongShakeIndex(optIndex);
      setTimeout(() => setWrongShakeIndex(null), 500);
    }
  };

  const handleFinish = () => {
    let score = 0;
    const userAnswers: UserAnswerRecord[] = questions.map((q, idx) => {
      const selected = selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1;
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
      timeSpentSeconds: totalSecondsSpent,
      completedAt: new Date().toISOString(),
      isPassed,
      userAnswers,
    };

    const { unlockedNext } = recordTestAttempt(attempt);
    onFinish(attempt, unlockedNext, nextBlock?.title);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] pb-6 animate-in fade-in">
      {/* Test Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm mb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                {testPackage.title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {block.title} • {questions.length} ta savol
              </p>
            </div>
          </div>

          {/* Active 2-min Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors ${
              secondsRemaining < 15
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse'
                : secondsRemaining < 30
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Progress Bar & Question Jump Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Savol: {currentIndex + 1} / {questions.length}</span>
            <span>Javob berildi: {answeredCount}/{questions.length}</span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Dots / Pills Carousel */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {questions.map((_, i) => {
              const isCurrent = i === currentIndex;
              const isAnswered = selectedAnswers[i] !== undefined;

              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-6 h-6 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-110'
                      : isAnswered
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex-1 flex flex-col justify-between">
        <div>
          <div className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] mb-3">
            Savol #{currentIndex + 1}
          </div>

          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug mb-5">
            {currentQ.text}
          </h3>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, optIdx) => {
              const letters = ['A', 'B', 'C', 'D'];
              const isSelected = currentAnswer === optIdx;
              const isShaking = wrongShakeIndex === optIdx;

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center gap-3 transition-all duration-150 ${
                    isShaking ? 'animate-wrong-shake' : ''
                  } ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-600 dark:border-indigo-500 text-indigo-900 dark:text-white shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {letters[optIdx]}
                  </span>
                  <span className="leading-relaxed flex-1">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={currentIndex === 0}
            onClick={() => {
              triggerHaptic('light');
              setCurrentIndex((idx) => Math.max(0, idx - 1));
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Oldingisi</span>
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                setCurrentIndex((idx) => idx + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-600/20"
            >
              <span>Keyingisi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowConfirmFinish(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20"
            >
              <span>Testni yakunlash</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirm Finish Modal */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
              Testni yakunlaysizmi?
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Siz {questions.length} ta savoldan {answeredCount} tasiga javob berdingiz.
              {answeredCount < questions.length && (
                <span className="block text-amber-500 font-semibold mt-1">
                  Diqqat: {questions.length - answeredCount} ta savol belgilanmagan!
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Davom etish
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                Ha, yakunlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
