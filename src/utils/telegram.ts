/**
 * Telegram WebApp Integration & Audio FX Engine
 */

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: string;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function isTelegramEnvironment(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initData);
}

export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
    } catch (e) {
      console.warn('Telegram WebApp init notice:', e);
    }
  }
}

// -------------------------------------------------------------
// Referral & Telegram Native Share System
// -------------------------------------------------------------
export const BOT_USERNAME = 'YuksalQuizBot';

export const REFERRAL_SHARE_TEXT =
  "🎯 HEMIS va fan testlariga tayyorlanish uchun zo'r ilova topdim! Ro'yxatdan o't va 20 000 so'mlik vaucherga ega bo'l 👇";

export function getTelegramUserId(): string {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id.toString();
  }
  return 'guest_12345';
}

export function generateReferralLink(userId?: string): string {
  const id = userId || getTelegramUserId();
  return `https://t.me/${BOT_USERNAME}?start=ref_${id}`;
}

/**
 * Triggers native Telegram chat picker share sheet via openTelegramLink
 */
export function triggerTelegramNativeShare(
  inviteLink: string,
  shareText: string = REFERRAL_SHARE_TEXT
): boolean {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
  const tg = getTelegramWebApp();

  if (tg && typeof tg.openTelegramLink === 'function') {
    try {
      tg.openTelegramLink(shareUrl);
      return true;
    } catch (e) {
      console.warn('openTelegramLink error:', e);
    }
  }

  // Fallback for standard browsers / desktop preview
  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank');
    return true;
  }
  return false;
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' | 'warning') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) {
    // Fallback for vibration API on mobile browsers
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'selection' || type === 'light') navigator.vibrate(15);
      else if (type === 'medium') navigator.vibrate(30);
      else if (type === 'heavy' || type === 'error') navigator.vibrate([40, 30, 40]);
      else if (type === 'success') navigator.vibrate([20, 50, 20]);
    }
    return;
  }

  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'error' || type === 'warning') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    console.debug('Haptic error:', e);
  }
}

// -------------------------------------------------------------
// Web Audio Synthesizer (Instant, Zero Latency, 100% Offline)
// -------------------------------------------------------------
class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public soundEnabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play subtle cheerful chime on correct answer
  playCorrect() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

    osc2.frequency.setValueAtTime(1046.5, now); // C6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // Play gentle, non-annoying buzz on wrong answer
  playWrong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18); // F3

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Coin reward bell
  playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Subtle button click
  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundFX = new SoundEffectsManager();
