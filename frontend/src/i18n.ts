import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en.json';
import translationTR from './locales/tr.json';

const resources = {
  en: translationEN,
  tr: translationTR,
};

// Dil tercihini localStorage'dan al
const savedLanguage = localStorage.getItem('language') || 'tr';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'tr',
    lng: savedLanguage, // Başlangıç dilini ayarla
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  });

// Dil değişikliğini dinle ve kaydet
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n; 