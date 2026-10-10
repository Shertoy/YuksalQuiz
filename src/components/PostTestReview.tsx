import React, { useState } from 'react';
import { TestAttempt, TestPackage } from '../types';
import { useQuizStore } from '../store/useQuizStore';
import {
  Trophy,
  Coins,
  Clock,
  ArrowLeft,
  ArrowRight,
  Circle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  Award,
  BookOpen,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { getUnlockRequirementsMessage, localizeBlockTitle } from '../utils/testSplitter';
import { useTranslation } from '../i18n/useTranslation';
import { decodeHtmlEntities } from '../utils/security';

interface PostTestReviewProps {
  attempt: TestAttempt;
  testPackage: TestPackage;
  unlockedNext: boolean;
  nextBlockTitle?: string;
  onRetake: () => void;
  onDone: () => void;
  onStartNextBlock?: (nextBlockId: string) => void;
}

export const PostTestReview: React.FC<PostTestReviewProps> = ({
  attempt,
  testPackage,
  unlockedNext,
  nextBlockTitle,
  onRetake,
  onDone,
  onStartNextBlock,
}) => {
  const { setActiveTab } = useQuizStore();
  const { tr } = useTranslation();
  const [reviewIndex, setReviewIndex] = useState(0);

  const currentBlockIndex = testPackage.blocks.findIndex(
    (b) => b.id === attempt.blockId || b.title === attempt.blockTitle
  );
  const currentBlock =
    currentBlockIndex !== -1 ? testPackage.blocks[currentBlockIndex] : testPackage.blocks[0];
  const nextBlock =
    currentBlockIndex !== -1 && currentBlockIndex + 1 < testPackage.blocks.length
      ? testPackage.blocks[currentBlockIndex + 1]
      : undefined;

  const passingScore =
    currentBlock?.passingScore || Math.max(1, Math.ceil(attempt.totalQuestions * 0.7));
  const isPassed = attempt.score >= passingScore || attempt.isPassed;

  const currentAnswer = attempt.userAnswers[reviewIndex];

  // Coins earned calculation
  const isPerfect = attempt.score === attempt.totalQuestions && attempt.totalQuestions >= 20;
  const isBonusPart = isPassed && currentBlock && currentBlock.blockNumber >= 4 && currentBlock.blockNumber <= 6;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const total = attempt.userAnswers.length;

  return (
    <div className="space-y-4 pb-28">
      {/* Natija */}
      <section className={`${card} p-5`}>
        <div className="flex items-center gap-2">
          {isPassed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
          )}
          <span
            className={`text-[14px] font-semibold ${
              isPassed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {isPassed
              ? tr("Blokdan o'tdingiz", 'Блок пройден', 'Block passed')
              : tr("O'tish uchun yetarli emas", 'Недостаточно для прохождения', 'Not enough to pass')}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-50">
          {decodeHtmlEntities(attempt.testPackageTitle)}
        </h2>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{localizeBlockTitle(decodeHtmlEntities(attempt.blockTitle))}</p>

        <div className="mt-5 flex items-end gap-3">
          <span className="text-5xl font-bold tracking-[-0.03em] text-slate-900 dark:text-slate-50 tabular-nums leading-none">
            {attempt.score}
            <span className="text-2xl text-slate-400 dark:text-slate-500">/{attempt.totalQuestions}</span>
          </span>
          <span className="pb-1 text-[15px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            {attempt.percentage}%
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 pt-3 text-center">
          <div>
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">+{attempt.score * 4}</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{tr('Ball', 'Баллы', 'Points')}</div>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{passingScore}</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{tr("O'tish chegarasi", 'Проходной балл', 'Pass mark')}</div>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
              {formatTime(attempt.timeSpentSeconds)}
            </div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{tr('Vaqt', 'Время', 'Time')}</div>
          </div>
        </div>

        {(isPerfect || isBonusPart) && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950 px-3 py-2.5 text-[13px] font-medium text-amber-800 dark:text-amber-200">
            <Coins className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>
              {isPerfect && tr('+1 tanga: 100% natija. ', '+1 монета: результат 100%. ', '+1 coin: 100% score. ')}
              {isBonusPart && tr('+5 tanga: 4–6-qism bonusi.', '+5 монет: бонус за части 4–6.', '+5 coins: parts 4–6 bonus.')}
            </span>
          </div>
        )}

        {!isPassed ? (
          <p className="mt-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            {getUnlockRequirementsMessage(attempt.blockTitle, attempt.score, passingScore, nextBlockTitle)}
          </p>
        ) : unlockedNext ? (
          <p className="mt-4 text-[13px] leading-relaxed text-emerald-700 dark:text-emerald-300 font-medium">
            {tr(
              `"${localizeBlockTitle(nextBlockTitle || '') || 'Keyingi qism'}" ochildi.`,
              `«${localizeBlockTitle(nextBlockTitle || '') || 'Следующая часть'}» открыта.`,
              `"${localizeBlockTitle(nextBlockTitle || '') || 'Next part'}" is unlocked.`
            )}
          </p>
        ) : null}
      </section>

      {/* Harakatlar */}
      <div className="space-y-2">
        {isPassed && nextBlock ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('success');
              if (onStartNextBlock) onStartNextBlock(nextBlock.id);
              else onDone();
            }}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2 transition-colors"
          >
            <span>
              {tr(
                `${localizeBlockTitle(decodeHtmlEntities(nextBlock.title))}ni boshlash`,
                `Начать: ${localizeBlockTitle(decodeHtmlEntities(nextBlock.title))}`,
                `Start ${localizeBlockTitle(decodeHtmlEntities(nextBlock.title))}`
              )}
            </span>
            <ArrowRight className="w-5 h-5" strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onRetake();
            }}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-5 h-5" strokeWidth={1.75} />
            <span>{tr('Qayta yechish', 'Пройти заново', 'Retake')}</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {isPassed && nextBlock && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onRetake();
              }}
              className="min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-[14px] active:bg-slate-200 dark:active:bg-slate-700"
            >
              {tr('Qayta yechish', 'Пройти заново', 'Retake')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onDone();
            }}
            className={`min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-[14px] active:bg-slate-200 dark:active:bg-slate-700 ${
              isPassed && nextBlock ? '' : 'col-span-2'
            }`}
          >
            {tr('Testlarga qaytish', 'К тестам', 'Back to tests')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setActiveTab('leaderboard');
            onDone();
          }}
          className="w-full min-h-[44px] text-[14px] font-medium text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center gap-1.5"
        >
          <Trophy className="w-4 h-4" strokeWidth={1.75} />
          <span>{tr("Reytingdagi o'rnim", 'Моё место в рейтинге', 'My rank')}</span>
        </button>
      </div>

      {/* Savollar tahlili */}
      <section className={`${card} p-5`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">{tr('Savollar tahlili', 'Разбор вопросов', 'Question review')}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={reviewIndex === 0}
              onClick={() => {
                triggerHaptic('light');
                setReviewIndex((prev) => Math.max(0, prev - 1));
              }}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800 disabled:opacity-30"
              aria-label={tr('Oldingi savol', 'Предыдущий вопрос', 'Previous question')}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
            </button>
            <span
              className={`min-w-[64px] text-center text-[13px] font-semibold tabular-nums ${
                currentAnswer.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'
              }`}
            >
              {reviewIndex + 1} / {total}
            </span>
            <button
              type="button"
              disabled={reviewIndex === total - 1}
              onClick={() => {
                triggerHaptic('light');
                setReviewIndex((prev) => Math.min(total - 1, prev + 1));
              }}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800 disabled:opacity-30"
              aria-label={tr('Keyingi savol', 'Следующий вопрос', 'Next question')}
            >
              <ArrowRight className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Savollar xaritasi */}
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label={tr('Savollar', 'Вопросы', 'Questions')}>
          {attempt.userAnswers.map((ans, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setReviewIndex(i)}
              aria-label={`${i + 1}: ${ans.isCorrect ? tr("to'g'ri", 'верно', 'correct') : tr('xato', 'неверно', 'wrong')}`}
              className={`w-8 h-8 rounded-lg text-[12px] font-semibold tabular-nums transition-colors ${
                i === reviewIndex
                  ? 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900'
                  : ans.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-slate-900 dark:text-slate-50">
          {decodeHtmlEntities(currentAnswer.questionText)}
        </p>

        <div className="mt-3 space-y-2">
          {currentAnswer.options.map((opt, optIdx) => {
            const isUserSelection = currentAnswer.selectedOption === optIdx;
            const isCorrectAnswer = currentAnswer.correctOptionIndex === optIdx;

            let style = 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
            if (isCorrectAnswer) {
              style = 'bg-emerald-50 dark:bg-emerald-950 border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-50';
            } else if (isUserSelection && !currentAnswer.isCorrect) {
              style = 'bg-orange-50 dark:bg-orange-950 border-orange-600 dark:border-orange-400 text-orange-950 dark:text-orange-50';
            }

            return (
              <div key={optIdx} className={`px-3 py-2.5 rounded-xl border flex items-center gap-3 text-[14px] ${style}`}>
                <span className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-[12px] shrink-0">
                  {['A', 'B', 'C', 'D', 'E', 'F'][optIdx]}
                </span>
                <span className="flex-1 leading-relaxed">{decodeHtmlEntities(opt)}</span>
                {isCorrectAnswer && (
                  <span className="shrink-0 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">{tr("To'g'ri", 'Верно', 'Correct')}</span>
                )}
                {isUserSelection && !currentAnswer.isCorrect && (
                  <span className="shrink-0 text-[12px] font-semibold text-orange-700 dark:text-orange-300">{tr('Sizning javobingiz', 'Ваш ответ', 'Your answer')}</span>
                )}
              </div>
            );
          })}
          {currentAnswer.selectedOption < 0 && (
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{tr('Bu savolga javob berilmagan.', 'На этот вопрос нет ответа.', 'This question was not answered.')}</p>
          )}
        </div>

        {currentAnswer.explanation && (
          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
            <span className="block text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{tr('Izoh', 'Пояснение', 'Explanation')}</span>
            {decodeHtmlEntities(currentAnswer.explanation)}
          </div>
        )}
      </section>
    </div>
  );
};
