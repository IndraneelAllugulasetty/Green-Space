import { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, SUPPORTED_LANGUAGES } from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('project_green_lang');
      const isValid = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
      return isValid ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('project_green_lang', lang);
    } catch {
      // LocalStorage access fallback
    }
  }, [lang]);

  // Set language directly by code
  function setLanguage(langCode) {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
      setLang(langCode);
    }
  }

  // Cycle through supported languages
  function toggleLanguage() {
    setLang((prev) => {
      const index = SUPPORTED_LANGUAGES.findIndex((l) => l.code === prev);
      const nextIndex = (index + 1) % SUPPORTED_LANGUAGES.length;
      return SUPPORTED_LANGUAGES[nextIndex].code;
    });
  }

  // Translation helper with English fallback
  function t(key, fallback = '') {
    if (!key) return '';
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en?.[key] || fallback || key;
  }

  const activeLanguageObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLanguage,
        toggleLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        activeLanguage: activeLanguageObj
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
