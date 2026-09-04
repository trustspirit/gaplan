import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'dayjs/locale/en'
import ko from '@/i18n/public/ko.json'
import en from '@/i18n/public/en.json'

// 본 앱의 src/i18n/index.ts와 같은 일을 하되 공개 사전만 싣는다. 본 앱 초기화를
// 재사용하면 그 파일이 import하는 전체 사전(gzip 30.6 kB)이 함께 딸려 온다.
// 언어 저장 키도 본 앱(gaplan-lang)과 다르다 — 공개 페이지는 자기 토글만 기억한다.
const STORAGE_KEY = 'publicLang'

function savedLang(): 'ko' | 'en' {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ko'
  } catch {
    return 'ko'
  }
}

const lng = savedLang()
dayjs.locale(lng)

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (next) => {
  dayjs.locale(next === 'en' ? 'en' : 'ko')
})

export default i18n
