import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko.json';
import en from './en.json';
const STORAGE_KEY = 'gaplan-lang';
const savedLang = localStorage.getItem(STORAGE_KEY) ?? 'ko';
i18n
    .use(initReactI18next)
    .init({
    resources: {
        ko: { translation: ko },
        en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
});
// Persist language changes
i18n.on('languageChanged', (lng) => {
    localStorage.setItem(STORAGE_KEY, lng);
});
export default i18n;
export const LANGUAGES = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
];
