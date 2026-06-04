import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import 'dayjs/locale/en';
import ko from './ko.json';
import en from './en.json';
const STORAGE_KEY = 'gaplan-lang';
const savedLang = localStorage.getItem(STORAGE_KEY) ?? 'ko';
// Set initial dayjs locale to match saved language
dayjs.locale(savedLang === 'en' ? 'en' : 'ko');
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
// Keep dayjs locale in sync with i18n language
i18n.on('languageChanged', (lng) => {
    localStorage.setItem(STORAGE_KEY, lng);
    dayjs.locale(lng === 'en' ? 'en' : 'ko');
});
export default i18n;
export const LANGUAGES = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
];
