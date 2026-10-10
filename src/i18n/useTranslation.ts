import { useQuizStore } from '../store/useQuizStore';
import { translations, Language, Translations } from './translations';

/** Bir joyda ishlatiladigan qisqa matnlar uchun: tr("O'zbekcha", 'Русский', 'English') */
export type Tr = (uz: string, ru: string, en: string) => string;

export function pickLang(language: Language | string | undefined, uz: string, ru: string, en: string): string {
  if (language === 'ru') return ru;
  if (language === 'en') return en;
  return uz;
}

export function useTranslation() {
  const language = useQuizStore((state) => state.language) || 'uz';
  const setLanguage = useQuizStore((state) => state.setLanguage);

  const t: Translations = translations[language] || translations.uz;
  const tr: Tr = (uz, ru, en) => pickLang(language, uz, ru, en);

  return { t, tr, language, setLanguage };
}

/** Komponentdan tashqarida (servis, store) joriy til bo'yicha matn tanlash */
export function trNow(uz: string, ru: string, en: string): string {
  return pickLang(useQuizStore.getState().language, uz, ru, en);
}
