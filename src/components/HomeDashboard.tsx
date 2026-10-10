import React, { useState, useEffect } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Coins,
  Flame,
  Award,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Ticket,
  ChevronRight,
  School,
  Share2,
  X,
  Crown,
  Medal,
  Edit3,
  MapPin,
  Trophy,
  CheckCircle2,
  Zap,
  Gift,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../utils/telegram';
import { TestPackage } from '../types';
import { decodeHtmlEntities } from '../utils/security';
import { UserAvatar } from './UserAvatar';
import { localDateKey } from '../utils/date';
import { shortUniversityName } from '../utils/faculty';
import { resetTestsNavigation } from '../utils/testsNav';

interface HomeDashboardProps {
  onStartTest: (pkg: TestPackage, blockId: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditProfile: () => void;
  onOpenReceiptModal?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartTest,
  onOpenCreateModal,
  onOpenEditProfile,
}) => {
  const {
    profile,
    testPackages,
    mistakes,
    setActiveTab,
    checkDailyStreak,
    claimVoucherDirectly,
    syncUserWithDatabase,
  } = useQuizStore();
  const { t, tr } = useTranslation();

  // Majburiy ravishda sahifa ochilganda keshga qaramasdan bazadan eng so'nggi ma'lumotlarni olish
  useEffect(() => {
    syncUserWithDatabase();
  }, [syncUserWithDatabase]);

  const [dailyClaimedMessage, setDailyClaimedMessage] = useState<string | null>(null);
  const [isCoinFlying, setIsCoinFlying] = useState(false);
  const [coinGlow, setCoinGlow] = useState(false);
  const [isDailyDisappearing, setIsDailyDisappearing] = useState(false);
  const [isVoucherDismissed, setIsVoucherDismissed] = useState(false);

  // Check if claimed today (24h lockout)
  const today = localDateKey();
  const isClaimedToday = profile.lastClaimedDailyDate === today;

  // Compute Rank title
  const getRankInfo = (completed: number) => {
    if (completed >= 30) return { title: t.rankMaster, Icon: Crown, color: 'text-orange-400' };
    if (completed >= 15) return { title: t.rankScholar, Icon: Award, color: 'text-emerald-400' };
    if (completed >= 5) return { title: t.rankActive, Icon: Medal, color: 'text-amber-400' };
    return { title: t.rankBeginner, Icon: Award, color: 'text-emerald-300' };
  };

  const rank = getRankInfo(profile.completedTestsCount);

  // Handle daily streak claim with flying coin visual animation and smooth exit
  const handleClaimDailyStreak = () => {
    if (isClaimedToday) {
      setDailyClaimedMessage(t.dailyBonusAlreadyClaimed);
      setTimeout(() => setDailyClaimedMessage(null), 3000);
      return;
    }

    // Trigger visual flying coin
    setIsCoinFlying(true);
    triggerHaptic('medium');

    setTimeout(() => {
      const result = checkDailyStreak();
      setIsCoinFlying(false);
      setCoinGlow(true);

      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.6 },
      });

      setDailyClaimedMessage(`${t.dailyBonusClaimedSuccess} (${result.streakCount})`);

      // Trigger disappearing animation after celebration
      setTimeout(() => {
        setIsDailyDisappearing(true);
      }, 1500);

      setTimeout(() => {
        setCoinGlow(false);
        setDailyClaimedMessage(null);
      }, 3500);
    }, 700);
  };

  // Handle direct claiming of 20 000 UZS starting voucher
  const [isVoucherClaiming, setIsVoucherClaiming] = useState(false);
  const [showVoucherCongratsModal, setShowVoucherCongratsModal] = useState(false);

  const handleClaimVoucher = async () => {
    if (isVoucherClaiming || profile.voucher_claimed || profile.voucherClaimed) return;
    setIsVoucherClaiming(true);
    triggerHaptic('medium');
    const ok = await claimVoucherDirectly();
    if (ok) {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.5 } });
      } catch {}
      setShowVoucherCongratsModal(true);
    }
    setIsVoucherClaiming(false);
  };

  const recommended = testPackages
    // Parolli yopiq testlar va savolsiz paketlar tavsiyada ko'rsatilmaydi
    .filter((pkg) => !(pkg.password && !pkg.isPublic) && (pkg.blocks?.[0]?.questions?.length || 0) > 0)
    .slice(0, 3);

  const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
  const rowBtn =
    'w-full flex items-center gap-3 px-4 min-h-[64px] text-left transition-colors active:bg-slate-50 dark:active:bg-slate-800/60';

  return (
    <div className="space-y-5 pb-4">
      {/* Salomlashish */}
      <section className="flex items-center gap-3 pt-1">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <UserAvatar avatar={profile.avatar} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">{t.greeting}</p>
          <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-50 truncate">
            {profile.firstName || 'Talaba'} {profile.lastName || ''}
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
            {profile.academicYear}
            {t.courseUnit}
            {profile.university ? ` · ${shortUniversityName(profile.university)}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenEditProfile();
          }}
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-200/70 dark:active:bg-slate-800 transition-colors"
          aria-label={tr('Profilni tahrirlash', 'Редактировать профиль', 'Edit profile')}
        >
          <Edit3 className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </section>

      {/* Kunlik bonus, xatolar, test yaratish */}
      <section className={`${card} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
        {(!isClaimedToday || isDailyDisappearing) && (
          <div
            className={`flex items-center gap-3 px-4 min-h-[64px] transition-opacity duration-500 ${
 isDailyDisappearing ? 'opacity-0' : 'opacity-100'
 }`}
          >
            <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                {t.dailyBonusTitle}
                <span className="ml-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                  {profile.streak} {t.streak}
                </span>
              </p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">{t.dailyBonusDesc}</p>
            </div>
            <button
              type="button"
              disabled={isClaimedToday || isCoinFlying}
              onClick={handleClaimDailyStreak}
              className="shrink-0 min-h-[40px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-semibold text-[13px] active:bg-slate-200 dark:active:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {isClaimedToday ? t.claimedToday : t.claimDailyBonus}
            </button>
          </div>
        )}

        {mistakes.length > 0 && (
          <button type="button" onClick={() => setActiveTab('results')} className={rowBtn}>
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">
                {t.mistakesTitle} <span className="text-orange-600 dark:text-orange-400 tabular-nums">({mistakes.length})</span>
              </p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">{t.mistakesDesc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenCreateModal();
          }}
          className={rowBtn}
        >
          <PlusCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">{t.createTestBtn}</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{t.bulkParserDesc}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
        </button>
      </section>

      {dailyClaimedMessage && (
        <div role="status" className="px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[13px] font-medium text-center animate-in fade-in">
          {dailyClaimedMessage}
        </div>
      )}

      {/* Tavsiya etilgan testlar */}
      {recommended.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{t.recommendedTests}</h3>
            <button
              type="button"
              onClick={() => {
                resetTestsNavigation();
                setActiveTab('tests');
              }}
              className="min-h-[40px] px-2 -mr-2 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300"
            >
              {t.all}
            </button>
          </div>
          <div className={`${card} divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden`}>
            {recommended.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onStartTest(pkg, pkg.blocks[0].id)}
                className={rowBtn}
              >
                <div className="min-w-0 flex-1 py-3">
                  <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
                    {decodeHtmlEntities(pkg.title)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400 truncate">
                    {[
                      decodeHtmlEntities(pkg.university || ''),
                      pkg.semester ? tr(`${pkg.semester}-semestr`, `${pkg.semester}-й семестр`, `Semester ${pkg.semester}`) : '',
                      `${pkg.totalQuestions} ${t.questionsCount}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 🎉 Voucher Congratulations Modal */}
      {showVoucherCongratsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
              <Gift className="w-7 h-7" strokeWidth={1.75} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {tr('Tabriklaymiz!', 'Поздравляем!', 'Congratulations!')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {tr(
                  "Sizga 20 000 so'mlik boshlang'ich vaucher berildi. Mablag' hamyoningizga o'tkazildi.",
                  'Вам начислен стартовый ваучер на 20 000 сум. Средства зачислены на баланс.',
                  'You received a 20,000 UZS starter voucher. It has been added to your wallet.'
                )}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{tr('Joriy hisobingiz', 'Текущий баланс', 'Current balance')}: {(profile.walletBalance || 0).toLocaleString('uz-UZ')} {tr("so'm", 'сум', 'UZS')}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowVoucherCongratsModal(false);
              }}
              className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-[15px] transition-colors"
            >
              {tr('Tushunarli', 'Понятно', 'Got it')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
