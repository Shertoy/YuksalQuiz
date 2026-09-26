import { useQuizStore } from '../store/useQuizStore';
import { translations, Language, Translations } from './translations';

export function useTranslation() {
  const language = useQuizStore((state) => state.language) || 'uz';
  const setLanguage = useQuizStore((state) => state.setLanguage);

  const t: Translations = translations[language] || translations.uz;

  return { t, language, setLanguage };
}
