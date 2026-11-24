/**
 * 스테이크별 링크를 보낼 때 붙이는 안내문. 칠십인(또는 집행서기)이 한 번 적어 두면 모든 요청에 쓰고,
 * 스테이크마다 다른 값은 {자리}에 채운다. 자리 이름은 한국어·영어 둘 다 받는다.
 */

export interface ShareValues {
  title: string
  unit: string
  /** "홍길동 회장님" / "President Hong" — 명단에 없으면 "회장님" / "President" */
  president: string
  seventy: string
  dates: string
  /** 마감일이 없으면 빈 문자열 */
  due: string
  /** 강조 사항이 없으면 빈 문자열 */
  guidance: string
  link: string
}

export const SHARE_TOKENS: { key: keyof ShareValues; ko: string; en: string }[] = [
  { key: 'title', ko: '제목', en: 'title' },
  { key: 'unit', ko: '스테이크', en: 'unit' },
  { key: 'president', ko: '회장', en: 'president' },
  { key: 'seventy', ko: '칠십인', en: 'seventy' },
  { key: 'dates', ko: '일요일', en: 'dates' },
  { key: 'due', ko: '마감일', en: 'due' },
  { key: 'guidance', ko: '강조', en: 'guidance' },
  { key: 'link', ko: '링크', en: 'link' },
]

/** 안내문 길이 제한 — 단톡방에 붙여 넣기 알맞은 정도 */
export const SHARE_TEMPLATE_MAX = 1000

const KO_DEFAULT = [
  '[와드 방문 추천 요청] {제목}',
  '{회장}, 안녕하세요.',
  '{칠십인} 지역 칠십인께서 방문 가능한 일요일({일요일})에 {스테이크}의 와드를 추천해 주시기 바랍니다.',
  '※ {강조}',
  '마감: {마감일}',
  '{링크}',
].join('\n')

const EN_DEFAULT = [
  '[Ward visit recommendations] {title}',
  'Dear {president},',
  'Please recommend a ward in {unit} for the Sundays Area Seventy {seventy} is available ({dates}).',
  '* {guidance}',
  'Due: {due}',
  '{link}',
].join('\n')

export function defaultShareTemplate(lang: 'ko' | 'en'): string {
  return lang === 'en' ? EN_DEFAULT : KO_DEFAULT
}

const tokenKey = new Map<string, keyof ShareValues>(SHARE_TOKENS.flatMap((tk) => [[tk.ko, tk.key], [tk.en, tk.key]]))
const TOKEN_RE = /\{([^{}\n]+)\}/g

/**
 * 안내문을 채운다.
 * - 자리가 있던 줄인데 채운 값이 모두 비었으면 그 줄을 뺀다(마감일·강조 사항이 없을 때).
 * - 링크 자리가 없으면 맨 끝에 링크를 붙인다 — 링크 없는 안내문은 쓸모가 없다.
 * - 모르는 {…}는 그대로 둔다.
 */
export function renderShareTemplate(template: string, values: ShareValues): string {
  let hasLink = false
  const lines = template.split('\n').flatMap((line) => {
    let tokens = 0
    let filled = 0
    const out = line.replace(TOKEN_RE, (whole, name: string) => {
      const key = tokenKey.get(name.trim())
      if (!key) return whole
      tokens++
      if (key === 'link') hasLink = true
      const v = values[key]
      if (v) filled++
      return v
    })
    return tokens > 0 && filled === 0 ? [] : [out]
  })
  const body = lines.join('\n').trim()
  return hasLink ? body : `${body}\n${values.link}`
}

export type ShareLang = 'ko' | 'en'

/** {회장} 자리 — 명단에서 이름을 못 찾으면 호칭만 */
export function presidentLabel(name: string | undefined, lang: ShareLang): string {
  const n = name?.trim()
  if (lang === 'en') return n ? `President ${n}` : 'President'
  return n ? `${n} 회장님` : '회장님'
}

/** 영어로 보내는 스테이크의 링크는 추천 페이지가 영어로 열리게 한다 */
export function linkFor(url: string, lang: ShareLang): string {
  return lang === 'en' ? `${url}?lang=en` : url
}
