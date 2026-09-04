import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'dayjs/locale/en'
import ko from './ko.json'
import en from './en.json'
// public.*는 공개 페이지 전용 엔트리(src/public/main.tsx)가 이 파일만 싣기 위해
// 갈라 둔 것이다 — 사전 전체(gzip 30.6 kB)를 공개 방문자에게 보내지 않으려는 것.
// 키의 원본은 여기 하나뿐이고, 본 앱은 최상위에 되붙여 예전과 같은 사전을 쓴다.
import koPublic from './public/ko.json'
import enPublic from './public/en.json'

const STORAGE_KEY = 'gaplan-lang'
const savedLang = localStorage.getItem(STORAGE_KEY) ?? 'ko'

// Set initial dayjs locale to match saved language
dayjs.locale(savedLang === 'en' ? 'en' : 'ko')

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: { ...ko, public: koPublic.public } },
      en: { translation: { ...en, public: enPublic.public } },
    },
    lng: savedLang,
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
  })

// Keep dayjs locale in sync with i18n language
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  dayjs.locale(lng === 'en' ? 'en' : 'ko')
})

export default i18n
export type SupportedLang = 'ko' | 'en'
export const LANGUAGES: { code: SupportedLang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
]
