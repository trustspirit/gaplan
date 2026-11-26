import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'dayjs/locale/en'
// 최상위 키만 named import — Vite가 나머지 키를 번들에서 뺀다. 본 앱 사전 전체(src/i18n/index.ts)를
// 싣지 않으면서 사본도 두지 않는다. 추천 화면이 다른 최상위 키를 쓰게 되면 여기에 더한다.
import { recommend as koRecommend, common as koCommon } from '@/i18n/ko.json'
import { recommend as enRecommend, common as enCommon } from '@/i18n/en.json'

// 언어는 링크가 정한다(?lang=en) — RecommendPage가 마운트할 때 바꾼다. 브라우저에 남기지 않는다.
const lng = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'ko'
dayjs.locale(lng)
document.documentElement.lang = lng

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: { recommend: koRecommend, common: koCommon } },
    en: { translation: { recommend: enRecommend, common: enCommon } },
  },
  lng,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (next) => {
  dayjs.locale(next === 'en' ? 'en' : 'ko')
  document.documentElement.lang = next === 'en' ? 'en' : 'ko'
})

export default i18n
