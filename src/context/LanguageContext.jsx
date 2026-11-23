import { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('project_green_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    localStorage.setItem('project_green_lang', lang);
  }, [lang]);

  function toggleLanguage() {
    setLang((prev) => (prev === 'en' ? 'kn' : 'en'));
  }

  function t(key) {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
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
