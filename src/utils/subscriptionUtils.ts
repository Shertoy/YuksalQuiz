import { LeaderboardUser } from '../types';

export interface UserSubscriptionInfo {
  status: 'active' | 'expiring_soon' | 'expired' | 'none';
  label: string;
  subLabel: string;
  daysRemaining: number;
  expiryDateFormatted: string | null;
  planName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

/**
 * Calculates remaining subscription duration and status for any user.
 */
export function getUserSubscriptionInfo(
  user: Partial<LeaderboardUser> & {
    paid_until?: string | null;
    subscriptionEnd?: string | null;
    has_paid?: boolean;
    isSubscribed?: boolean;
    subscriptionTier?: string | null;
    subscriptionPlan?: string | null;
  }
): UserSubscriptionInfo {
  const paidUntilRaw = user.paid_until || user.subscriptionEnd;
  const plan = user.subscriptionTier || user.subscriptionPlan || 'none';
  const planName =
    plan === '1_year'
      ? '1 yillik VIP'
      : plan === '6_months'
      ? '6 oylik'
      : plan === '3_months'
      ? '3 oylik'
      : user.has_paid
      ? 'Maxsus VIP'
      : 'Bepul';

  // Check if date string is provided and parseable
  if (paidUntilRaw) {
    try {
      const expiry = new Date(paidUntilRaw);
      if (!isNaN(expiry.getTime())) {
        const now = new Date();
        const diffMs = expiry.getTime() - now.getTime();
        const expiryDateFormatted = expiry.toLocaleDateString('uz-UZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        if (diffMs <= 0) {
          const pastDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          return {
            status: 'expired',
            label: 'Muddati tugagan',
            subLabel: pastDays === 0 ? 'Bugun tugadi' : `${pastDays} kun oldin tugagan (${expiryDateFormatted})`,
            daysRemaining: -pastDays,
            expiryDateFormatted,
            planName,
            badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
            badgeText: 'text-rose-600 dark:text-rose-400',
            badgeBorder: 'border-rose-200 dark:border-rose-900',
          };
        }

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        let timeText = '';
        if (diffDays >= 30) {
          const months = Math.floor(diffDays / 30);
          const remDays = diffDays % 30;
          timeText = remDays > 0 ? `${months} oy ${remDays} kun qoldi` : `${months} oy qoldi`;
        } else if (diffDays > 0) {
          timeText = `${diffDays} kun qoldi`;
        } else {
          timeText = `${diffHours} soat qoldi`;
        }

        const isExpiringSoon = diffDays <= 7;

        if (isExpiringSoon) {
          return {
            status: 'expiring_soon',
            label: timeText,
            subLabel: `${expiryDateFormatted} gacha faol`,
            daysRemaining: diffDays,
            expiryDateFormatted,
            planName,
            badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
            badgeText: 'text-amber-700 dark:text-amber-300',
            badgeBorder: 'border-amber-300 dark:border-amber-800',
          };
        }

        return {
          status: 'active',
          label: timeText,
          subLabel: `${expiryDateFormatted} gacha faol`,
          daysRemaining: diffDays,
          expiryDateFormatted,
          planName,
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
          badgeText: 'text-emerald-700 dark:text-emerald-300',
          badgeBorder: 'border-emerald-300 dark:border-emerald-800',
        };
      }
    } catch {
      // Fall through to has_paid check
    }
  }

  // If user has paid flag but no specific expiration date
  if (user.has_paid || user.isSubscribed) {
    return {
      status: 'active',
      label: 'Faol (Muddatsiz)',
      subLabel: 'Muddatsiz VIP obuna',
      daysRemaining: 9999,
      expiryDateFormatted: null,
      planName,
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      badgeBorder: 'border-emerald-300 dark:border-emerald-800',
    };
  }

  // Free user with no subscription
  return {
    status: 'none',
    label: "Obunasi yo'q",
    subLabel: 'Bepul rejimda',
    daysRemaining: 0,
    expiryDateFormatted: null,
    planName: 'Bepul',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-500 dark:text-slate-400',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
  };
}
