import { useEffect, useRef } from 'react';
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
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
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

let lastSyncedTelegramHex: string | null = null;

export function syncTelegramTheme(theme: 'dark' | 'light'): void {
  const tg = getTelegramWebApp();
  if (tg) {
    const isDark = theme === 'dark';
    const hex = isDark ? '#0c0a09' : '#fafaf9';
    if (lastSyncedTelegramHex === hex) {
      return; // Already synchronized, do not trigger redundant native events
    }
    try {
      if (typeof tg.setBackgroundColor === 'function') {
        tg.setBackgroundColor(hex);
      }
      if (typeof tg.setHeaderColor === 'function') {
        tg.setHeaderColor(hex);
      }
      lastSyncedTelegramHex = hex;
    } catch (e) {
      console.debug('Telegram theme sync error:', e);
    }
  }
}

export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      // "Yopishni tasdiqlash" faqat test ishlanayotganda yoqiladi (useTestClosingConfirmation)
      tg.disableClosingConfirmation?.();
    } catch (e) {
      console.warn('Telegram WebApp init notice:', e);
    }
  }
}

// -------------------------------------------------------------
// Referral & Telegram Native Share System
// -------------------------------------------------------------
export const BOT_USERNAME = 'YuksalQuiz_bot';

export const REFERRAL_SHARE_TEXT =
  "HEMIS va fan testlariga tayyorlanish uchun zo'r ilova topdim! Hoziroq kirib testlarni yechishni boshla:";

export function getTelegramUserId(): string {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id.toString();
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const cached = window.localStorage.getItem('yuksalquiz_user_id');
    if (cached && cached !== 'guest_12345') {
      return cached;
    }
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    window.localStorage.setItem('yuksalquiz_user_id', newId);
    return newId;
  }
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function getInitialUserId(): string {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user?.id) {
    return `tg_${tg.initDataUnsafe.user.id}`;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const cached = window.localStorage.getItem('yuksalquiz_user_id');
    if (cached && cached !== 'guest_12345') {
      return cached;
    }
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    window.localStorage.setItem('yuksalquiz_user_id', newId);
    return newId;
  }
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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

export let vibrationEnabled = true;

export function setVibrationEnabled(enabled: boolean): void {
  vibrationEnabled = enabled;
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' | 'warning') {
  if (!vibrationEnabled) return;
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback) {
      if (type === 'selection') {
        tg.HapticFeedback.selectionChanged?.();
      } else if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred?.(type);
      } else {
        tg.HapticFeedback.impactOccurred?.(type);
      }
      return;
    }

    // Safe fallback for vibration API on mobile browsers
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (type === 'selection' || type === 'light') navigator.vibrate(15);
        else if (type === 'medium') navigator.vibrate(30);
        else if (type === 'heavy' || type === 'error') navigator.vibrate([40, 30, 40]);
        else if (type === 'success') navigator.vibrate([20, 50, 20]);
      } catch {
        // Suppress iframe vibration SecurityError / NotAllowedError
      }
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

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Play pleasant, sparkling success chime on correct answer (success ding)
  playCorrect() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0.16, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);

      // Note 3 (harmonic shimmer): E6 (1318.5 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318.5, now + 0.14);
      gain3.gain.setValueAtTime(0.09, now + 0.14);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.14);
      osc3.stop(now + 0.45);
    } catch (e) {
      console.debug('playCorrect audio error:', e);
    }
  }

  // Play distinct game-show error buzzer (two fast buzz pulses)
  playWrong() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Pulse 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(500, now);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(150, now);
      osc1.frequency.linearRampToValueAtTime(130, now + 0.09);

      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.09);

      // Pulse 2 (short pause of 30ms, then second buzz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();
      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(450, now + 0.12);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(130, now + 0.12);
      osc2.frequency.linearRampToValueAtTime(110, now + 0.23);

      gain2.gain.setValueAtTime(0.14, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.23);
    } catch (e) {
      console.debug('playWrong audio error:', e);
    }
  }

  // Coin reward bell
  playCoin() {
    try {
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
    } catch (e) {
      console.debug('playCoin audio error:', e);
    }
  }

  // Subtle button click
  playClick() {
    try {
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
    } catch (e) {
      console.debug('playClick audio error:', e);
    }
  }

  // Aliases for intuitive semantic usage
  playSuccess() {
    this.playCorrect();
  }

  playError() {
    this.playWrong();
  }
}

export const soundFX = new SoundEffectsManager();


// -------------------------------------------------------------
// Telegram "Orqaga" tugmasi (Android tizim tugmasi ham shu orqali ishlaydi)
// -------------------------------------------------------------
// Bir nechta komponent tugmani so'rashi mumkin. Eng yuqori ustuvorlikdagi (priority) ishlaydi,
// tenglarida esa oxirgi faollashgani. Masalan: ochiq oyna (2) > yo'nalish/universitet (1) > bo'lim (0).
interface BackEntry {
  handler: { current: (() => void) | null };
  priority: { current: number };
}
const backHandlerStack: BackEntry[] = [];
let backClickBound = false;

function syncTelegramBackButton(): void {
  const tg = getTelegramWebApp();
  if (!tg?.BackButton) return;
  if (!backClickBound) {
    tg.BackButton.onClick(() => {
      let top: BackEntry | null = null;
      for (const e of backHandlerStack) {
        if (!top || e.priority.current >= top.priority.current) top = e;
      }
      top?.handler.current?.();
    });
    backClickBound = true;
  }
  if (backHandlerStack.length > 0) tg.BackButton.show();
  else tg.BackButton.hide();
}

/**
 * handler berilsa Telegram "Orqaga" tugmasi ko'rinadi va bosilganda shu handler ishlaydi.
 * handler null bo'lsa tugma yashiriladi (ilova yopilishi o'rniga).
 * priority: bir vaqtda bir nechta handler bo'lsa, kattasi ishlaydi.
 */
export function useTelegramBackButton(handler: (() => void) | null, priority = 0): void {
  const ref = useRef<(() => void) | null>(handler);
  ref.current = handler;
  const prioRef = useRef(priority);
  prioRef.current = priority;
  const active = Boolean(handler);
  useEffect(() => {
    if (!active) return;
    const entry: BackEntry = { handler: ref, priority: prioRef };
    backHandlerStack.push(entry);
    syncTelegramBackButton();
    return () => {
      const i = backHandlerStack.lastIndexOf(entry);
      if (i >= 0) backHandlerStack.splice(i, 1);
      syncTelegramBackButton();
    };
  }, [active]);
}

/** Test ishlanayotganda tasodifan ilovani yopib qo'ymaslik uchun tasdiq so'raladi */
export function useTestClosingConfirmation(): void {
  useEffect(() => {
    const tg = getTelegramWebApp();
    try {
      tg?.enableClosingConfirmation?.();
    } catch {}
    return () => {
      try {
        tg?.disableClosingConfirmation?.();
      } catch {}
    };
  }, []);
}
