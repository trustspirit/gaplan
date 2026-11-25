import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'dayjs/locale/en'
import ko from './ko.json'
// public.*는 공개 페이지 전용 엔트리(src/public/main.tsx)가 이 파일만 싣기 위해
// 갈라 둔 것이다 — 사전 전체(gzip 30.6 kB)를 공개 방문자에게 보내지 않으려는 것.
// 키의 원본은 여기 하나뿐이고, 본 앱은 최상위에 되붙여 예전과 같은 사전을 쓴다.
import koPublic from './public/ko.json'

const STORAGE_KEY = 'gaplan-lang'
const savedLang = localStorage.getItem(STORAGE_KEY) ?? 'ko'

// Set initial dayjs locale to match saved language
dayjs.locale(savedLang === 'en' ? 'en' : 'ko')

/**
 * 한국어 사전만 번들에 싣고, 다른 언어는 처음 쓸 때 받는다(영어 사전 gzip 약 15 kB).
 * 사용자 대부분은 한국어라 메인 번들에서 빠진다. 영어를 고른 사용자는 사전이 올 때까지
 * react-i18next가 Suspense로 기다린다 — 한국어가 잠깐 비치지 않는다.
 */
const lazyDictionaries = {
  type: 'backend' as const,
  init() {},
  read(lng: string, _ns: string, callback: (err: unknown, data?: object) => void) {
    if (lng !== 'en') return callback(null, {})
    Promise.all([import('./en.json'), import('./public/en.json')])
      .then(([en, enPublic]) => callback(null, { ...en.default, public: enPublic.default.public }))
      .catch((e) => callback(e))
  },
}

i18n
  .use(initReactI18next)
  .use(lazyDictionaries)
  .init({
    resources: {
      ko: { translation: { ...ko, public: koPublic.public } },
    },
    // resources에 없는 언어(en)만 위 backend로 받는다
    partialBundledLanguages: true,
    lng: savedLang,
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
  })

// Keep dayjs locale in sync with i18n language
i18n.on('languageChanged', (lng) => {
  // 공개 추천 링크는 링크가 언어를 정한다 — 앱 설정으로 남기지 않는다
  if (!window.location.pathname.startsWith('/recommend/')) localStorage.setItem(STORAGE_KEY, lng)
  dayjs.locale(lng === 'en' ? 'en' : 'ko')
})

export default i18n
export type SupportedLang = 'ko' | 'en'
export const LANGUAGES: { code: SupportedLang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
]
