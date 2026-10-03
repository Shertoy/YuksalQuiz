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
import { getUnlockRequirementsMessage } from '../utils/testSplitter';
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
    return `${m} daqiqa ${s} soniya`;
  };

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Result Summary Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-xl ${
          isPassed
            ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 shadow-emerald-600/20'
            : 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-slate-900/30'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isPassed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-orange-500/20 text-orange-300 border border-orange-400/30'}`}>
              {isPassed ? <Award className="w-5 h-5 text-emerald-300" strokeWidth={1.75} /> : <BookOpen className="w-5 h-5 text-orange-300" strokeWidth={1.75} />}
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold opacity-80">
                Natija xulosasi
              </span>
              <h2 className="text-lg font-black">{decodeHtmlEntities(attempt.testPackageTitle)}</h2>
              <p className="text-xs opacity-90">{decodeHtmlEntities(attempt.blockTitle)}</p>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 ${
              isPassed ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
            }`}
          >
            {isPassed ? <Unlock className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />}
            <span>{isPassed ? 'O\'tdi' : 'Yetarli emas'}</span>
          </div>
        </div>

        {/* Big Score Stats with 4-Point Rating */}
        <div className="grid grid-cols-4 gap-2 bg-black/20 backdrop-blur-sm rounded-2xl p-3 text-center mb-3">
          <div>
            <div className="text-2xl font-black text-amber-300">
              +{attempt.score * 4}
            </div>
            <p className="text-[10px] text-white/70 font-semibold uppercase">Ball</p>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {attempt.score}/{attempt.totalQuestions}
            </div>
            <p className="text-[10px] text-white/70 font-semibold uppercase">To'g'ri</p>
          </div>
          <div>
            <div className="text-2xl font-black text-orange-300">
              {attempt.percentage}%
            </div>
            <p className="text-[10px] text-white/70 font-semibold uppercase">Foiz</p>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-300 flex items-center justify-center gap-1">
              <Clock className="w-4 h-4" strokeWidth={1.75} />
              <span>{Math.round(attempt.timeSpentSeconds / 60)}d</span>
            </div>
            <p className="text-[10px] text-white/70 font-semibold uppercase">Vaqt</p>
          </div>
        </div>

        {/* Coin Rewards notice */}
        {(isPerfect || isBonusPart) && (
          <div className="bg-amber-400/20 border border-amber-300/30 rounded-2xl p-2.5 flex items-center gap-2 mb-3 text-amber-200 text-xs font-bold">
            <Coins className="w-5 h-5 text-amber-400 animate-bounce" strokeWidth={1.75} />
            <div>
              {isPerfect && <div>+1 Tanga (Mukammal 100% natija)!</div>}
              {isBonusPart && <div>+5 Bonus Tangalar (4-6 qism g'olibligi)!</div>}
            </div>
          </div>
        )}

        {/* Sequential unlock explanation */}
        {!isPassed ? (
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl p-3 text-xs text-amber-100 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {getUnlockRequirementsMessage(
                attempt.blockTitle,
                attempt.score,
                passingScore,
                nextBlockTitle
              )}
            </p>
          </div>
        ) : unlockedNext ? (
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-3 text-xs text-emerald-100 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
            <p className="font-semibold">
              Tabriklaymiz! '{nextBlockTitle || 'Keyingi test'}' muvaffaqiyatli ochildi!
            </p>
          </div>
        ) : null}
      </div>

      {/* Question Review Section with Navigation Icons: Left (<-), Circle (O), Right (->) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Savollarni tahlil qilish
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {reviewIndex + 1} / {attempt.userAnswers.length}
          </span>
        </div>

        {/* Question Review Carousel Navigation: Left (<-), Circle (O), Right (->) */}
        <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/60 mb-4">
          {/* Left Arrow (<-) */}
          <button
            disabled={reviewIndex === 0}
            onClick={() => {
              triggerHaptic('light');
              setReviewIndex((prev) => Math.max(0, prev - 1));
            }}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all flex items-center gap-1 text-xs font-bold"
            title="Oldingi savol"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Oldingi</span>
          </button>

          {/* Circle (O) Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs border ${
                currentAnswer.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-orange-50 dark:bg-orange-950/80 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300'
              }`}
            >
              <Circle className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>#{reviewIndex + 1}</span>
              {currentAnswer.isCorrect ? (
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              ) : (
                <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
            </div>
          </div>

          {/* Right Arrow (->) */}
          <button
            disabled={reviewIndex === attempt.userAnswers.length - 1}
            onClick={() => {
              triggerHaptic('light');
              setReviewIndex((prev) => Math.min(attempt.userAnswers.length - 1, prev + 1));
            }}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all flex items-center gap-1 text-xs font-bold"
            title="Keyingi savol"
          >
            <span className="hidden sm:inline">Keyingi</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Current Question Review Details */}
        <div className="space-y-3">
          <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed">
            {decodeHtmlEntities(currentAnswer.questionText)}
          </p>

          <div className="space-y-2 text-xs">
            {currentAnswer.options.map((opt, optIdx) => {
              const isUserSelection = currentAnswer.selectedOption === optIdx;
              const isCorrectAnswer = currentAnswer.correctOptionIndex === optIdx;

              let style = 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
              if (isCorrectAnswer) {
                style = 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (isUserSelection && !currentAnswer.isCorrect) {
                style = 'bg-orange-50 dark:bg-orange-950/80 border-orange-500 text-orange-900 dark:text-orange-200 font-bold';
              }

              return (
                <div
                  key={optIdx}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all ${style}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-300 dark:border-slate-600">
                      {['A', 'B', 'C', 'D'][optIdx]}
                    </span>
                    <span>{decodeHtmlEntities(opt)}</span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {isCorrectAnswer && (
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                        To'g'ri javob
                      </span>
                    )}
                    {isUserSelection && !currentAnswer.isCorrect && (
                      <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
                        Siz tanlagan
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation if available */}
          {currentAnswer.explanation && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <span className="font-bold block mb-1">Izoh va tushuntirish:</span>
              <span>{decodeHtmlEntities(currentAnswer.explanation)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Retake, Start Next Block, and Done Actions */}
      <div className="space-y-2.5">
        {isPassed && nextBlock && (
          <button
            onClick={() => {
              triggerHaptic('success');
              if (onStartNextBlock) {
                onStartNextBlock(nextBlock.id);
              } else {
                onDone();
              }
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <span>'{decodeHtmlEntities(nextBlock.title)}' ni boshlash</span>
            <ArrowRight className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('medium');
              onRetake();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            <span>Qayta topshirish</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onDone();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-95"
          >
            <span>Testlar ro'yxatiga qaytish</span>
          </button>
        </div>

        <button
          onClick={() => {
            triggerHaptic('selection');
            setActiveTab('leaderboard');
            onDone();
          }}
          className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Trophy className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
          <span>Reytingdagi o'rningizni ko'rish</span>
        </button>
      </div>
    </div>
  );
};
