import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TestPackage, UserAnswerRecord, TestAttempt } from '../types';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import { Clock, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { triggerHaptic, soundFX, useTelegramBackButton, useTestClosingConfirmation } from '../utils/telegram';
import { decodeHtmlEntities } from '../utils/security';
import { localizeBlockTitle } from '../utils/testSplitter';

/**
 * Fisher-Yates algorithm to shuffle options client-side uniformly.
 * Eliminates repetitive pattern of option 'B' always being correct without server load.
 */
function shuffleOptionsWithFisherYates(options: string[], correctOptionIndex: number) {
  const items = options.map((opt, idx) => ({
    text: opt,
    isCorrect: idx === correctOptionIndex,
  }));

  // Fisher-Yates shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = items[i];
    items[i] = items[j];
    items[j] = temp;
  }

  const shuffledOptions = items.map((item) => item.text);
  const newCorrectOptionIndex = items.findIndex((item) => item.isCorrect);

  return {
    options: shuffledOptions,
    correctOptionIndex: newCorrectOptionIndex >= 0 ? newCorrectOptionIndex : 0,
  };
}

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
  const { t, tr } = useTranslation();

  const block = testPackage.blocks.find((b) => b.id === blockId) || testPackage.blocks[0];

  // Client-side Fisher-Yates shuffle for options of each question
  const questions = useMemo(() => {
    return (block?.questions || []).map((q) => {
      if (!q.options || q.options.length <= 1) return q;
      const shuffled = shuffleOptionsWithFisherYates(q.options, q.correctOptionIndex);
      return {
        ...q,
        options: shuffled.options,
        correctOptionIndex: shuffled.correctOptionIndex,
      };
    });
  }, [block?.id]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wrongShakeIndex, setWrongShakeIndex] = useState<number | null>(null);

  // Global uninterrupted countdown timer (60s per question, min 180s)
  const totalTestDuration = Math.max(180, (questions.length || 1) * 60);
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
    const userAnswers: UserAnswerRecord[] = (questions || []).map((q, idx) => {
      const selected = finalAnswers[idx] !== undefined ? finalAnswers[idx] : -1;
      const isCorrect = selected === q.correctOptionIndex;
      if (isCorrect) score += 1;

      return {
        questionId: q.id,
        questionText: decodeHtmlEntities(q.text),
        options: (q.options || []).map((o) => decodeHtmlEntities(o)),
        selectedOption: selected,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation ? decodeHtmlEntities(q.explanation) : undefined,
      };
    });

    const isPassed = score >= (block?.passingScore || 0);
    const nextBlock = testPackage.blocks.find((b) => b.blockNumber === (block?.blockNumber || 0) + 1);

    const attempt: TestAttempt = {
      id: 'att-' + Math.random().toString(36).substring(2, 9),
      testPackageId: testPackage.id,
      testPackageTitle: decodeHtmlEntities(testPackage.title),
      university: decodeHtmlEntities(testPackage.university),
      department: decodeHtmlEntities(testPackage.department),
      blockId: block?.id || '',
      blockTitle: decodeHtmlEntities(block?.title || ''),
      score,
      totalQuestions: questions.length,
      percentage: questions.length > 0 ? Math.round((score / questions.length) * 100) : 0,
      timeSpentSeconds: timeSpent,
      completedAt: new Date().toISOString(),
      isPassed,
      userAnswers,
    };

    try {
      const { unlockedNext } = recordTestAttempt(attempt);
      onFinish(attempt, unlockedNext, nextBlock?.title);
    } catch (e) {
      console.warn('recordTestAttempt error in finishTestWithAnswers:', e);
      onFinish(attempt, false, nextBlock?.title);
    }
  };

  // Taymer haqiqiy vaqt bo'yicha hisoblanadi (Date.now). Telegram yig'ib qo'yilganda
  // setInterval sekinlashadi, shuning uchun soniyalarni sanash vaqtni "to'xtatib" qo'yardi.
  const startedAtRef = useRef(Date.now());
  useEffect(() => {
    startedAtRef.current = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setTotalSecondsSpent(elapsed);
      setSecondsRemaining(Math.max(0, totalTestDuration - elapsed));
    };
    const timer = setInterval(tick, 500);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [questions.length, totalTestDuration]);

  // Vaqt tugadi: testni yakunlash (state yangilanishidan tashqarida)
  useEffect(() => {
    if (secondsRemaining <= 0 && questions.length > 0) {
      finishTestWithAnswers(selectedAnswersRef.current, totalTestDuration);
    }
  }, [secondsRemaining]);

  // Javobdan keyingi 700ms kutish taymeri: testdan chiqilsa bekor qilinadi
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Telegram "Orqaga" tugmasi: chiqishni tasdiqlash oynasi; oyna ochiq bo'lsa uni yopadi
  useTelegramBackButton(() => setShowConfirmCancel((v) => !v), 3);
  useTestClosingConfirmation();

  // Option selection with instant feedback + 700ms pause + auto-advance
  const handleSelectOption = (optIndex: number) => {
    if (isTransitioning || selectedAnswers[currentIndex] !== undefined || !currentQ) return;

    setIsTransitioning(true);
    const updatedAnswers = {
      ...selectedAnswers,
      [currentIndex]: optIndex,
    };
    setSelectedAnswers(updatedAnswers);

    try {
      const isCorrect = optIndex === currentQ.correctOptionIndex;
      if (isCorrect) {
        try { soundFX.playCorrect(); } catch {}
        try { triggerHaptic('success'); } catch {}
      } else {
        try { soundFX.playWrong(); } catch {}
        try { triggerHaptic('error'); } catch {}
        setWrongShakeIndex(optIndex);
      }
    } catch (e) {
      console.warn('handleSelectOption audio/haptic error:', e);
    }

    // 700ms pause, then one-way advance or finish
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      setWrongShakeIndex(null);
      setIsTransitioning(false);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        finishTestWithAnswers(updatedAnswers, Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 700);
  };

  // Format timer
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercentage = questions.length
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

  // Blokda savol bo'lmasa ilova ishdan chiqmasin
  if (!block || questions.length === 0 || !currentQ) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
          <X className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{tr("Bu blokda hali savollar yo'q", 'В этом блоке пока нет вопросов', 'This block has no questions yet')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{tr("Boshqa blokni tanlang yoki keyinroq qayta urinib ko'ring.", 'Выберите другой блок или попробуйте позже.', 'Choose another block or try again later.')}</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm active:scale-[0.98]"
        >
          {tr('Orqaga', 'Назад', 'Back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-2 select-none">
      {/* Yuqori panel */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfirmCancel(true)}
            aria-label={tr('Testdan chiqish', 'Выйти из теста', 'Exit test')}
            className="w-11 h-11 -ml-2 shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-200/70 dark:active:bg-slate-800"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50 truncate">{testPackage.title}</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{localizeBlockTitle(block.title)}</p>
          </div>
          <div
            role="timer"
            aria-label={tr('Qolgan vaqt', 'Оставшееся время', 'Time left')}
            className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-semibold tabular-nums ${
              secondsRemaining < 60
                ? 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" strokeWidth={1.75} />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[12px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            {t.questionNumber} {currentIndex + 1} / {questions.length}
          </span>
          <span>{progressPercentage}%</span>
        </div>
        <div
          className="mt-1.5 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={currentIndex + 1}
        >
          <div
            className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-[width] duration-300 ease-[var(--ease-out)]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Savol */}
      <div className="flex-1 flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div>
          <h3 className="text-[17px] font-semibold leading-relaxed text-slate-900 dark:text-slate-50 mb-5">
            {decodeHtmlEntities(currentQ.text)}
          </h3>

          <div className="space-y-2.5" role="radiogroup" aria-label={tr('Javob variantlari', 'Варианты ответа', 'Answer options')}>
            {currentQ.options.map((opt, optIdx) => {
              const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
              const isSelected = currentAnswer === optIdx;
              const isCorrectAnswer = currentQ.correctOptionIndex === optIdx;
              const isShaking = wrongShakeIndex === optIdx;

              let cardStyle =
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 active:bg-slate-50 dark:active:bg-slate-800';
              let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

              if (currentAnswer !== undefined) {
                if (isSelected && isCorrectAnswer) {
                  cardStyle = 'bg-emerald-50 dark:bg-emerald-950 border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-50';
                  badgeStyle = 'bg-emerald-600 text-white';
                } else if (isSelected && !isCorrectAnswer) {
                  cardStyle = 'bg-orange-50 dark:bg-orange-950 border-orange-600 dark:border-orange-400 text-orange-950 dark:text-orange-50';
                  badgeStyle = 'bg-orange-600 text-white';
                } else if (!isSelected && isCorrectAnswer) {
                  cardStyle = 'bg-white dark:bg-slate-900 border-emerald-600 dark:border-emerald-400 border-dashed text-emerald-900 dark:text-emerald-100';
                  badgeStyle = 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
                } else {
                  cardStyle = 'opacity-50 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500';
                  badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                }
              }

              return (
                <button
                  key={`q${currentIndex}-opt${optIdx}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isTransitioning || currentAnswer !== undefined}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full min-h-[56px] px-3.5 py-3 rounded-xl border text-left text-[15px] font-medium flex items-center gap-3 transition-colors duration-150 touch-manipulation disabled:cursor-default ${
                    isShaking ? 'animate-wrong-shake' : ''
                  } ${cardStyle}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-[13px] shrink-0 ${badgeStyle}`}>
                    {letters[optIdx] || optIdx + 1}
                  </span>
                  <span className="leading-relaxed flex-1">{decodeHtmlEntities(opt)}</span>
                  {currentAnswer !== undefined && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
                  )}
                  {isSelected && !isCorrectAnswer && (
                    <X className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" strokeWidth={2} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-5 border-t border-slate-200 dark:border-slate-800 min-h-[56px] items-center">
          <button
            type="button"
            disabled={isTransitioning || currentAnswer !== undefined}
            onClick={() => {
              triggerHaptic('light');
              if (currentIndex < questions.length - 1) {
                setCurrentIndex((idx) => idx + 1);
              } else {
                finishTestWithAnswers(selectedAnswers, totalSecondsSpent);
              }
            }}
            className={`min-h-[44px] px-4 rounded-xl text-[14px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 inline-flex items-center gap-1.5 transition-opacity ${
              currentAnswer !== undefined ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <span>{currentIndex < questions.length - 1 ? t.nextBtn : t.finishTest}</span>
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Confirm Exit Modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-in fade-in">
          <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-[0_12px_40px_rgba(12,10,9,0.18)] border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
              <X className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
              {t.confirmExitTitle}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {t.confirmExitDesc}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[14px]"
              >
                {t.continueBtn}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-orange-700 dark:text-orange-300 font-semibold text-[14px]"
              >
                {t.exitBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
