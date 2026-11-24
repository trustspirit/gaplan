/**
 * 영어로 보내는 스테이크를 위해 요청의 한국어 값(제목·강조 사항·칠십인 이름·회장 이름)을
 * 영어로 옮겨 둔 것과 그 원문(source). 원문이 바뀌면 다시 옮긴다.
 * 웹 앱도 이 파일을 쓴다 — SDK를 불러오지 않는다(번역 호출은 requestTranslate.ts).
 */

export interface EnglishTexts {
  title: string
  guidance: string
  /** 회장들에게 전할 말 — 추천 페이지에 보인다 */
  note: string
  seventy: string
  /** unitId -> 회장 이름(호칭 없이) */
  presidents: Record<string, string>
}

export interface RequestEnglish extends EnglishTexts {
  source: EnglishTexts
}

export const PRESIDENT_ROLES = ['스테이크 회장', '지방부 회장']

/** 스테이크마다 그 회장 이름 — leaders의 한국어 단위 이름으로 맞춘다 */
export function presidentsOfUnits(
  units: { id: string; ko: string }[],
  leaders: { unitNameKo: string; role: string; name: string }[],
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const u of units) {
    const l = leaders.find((x) => x.unitNameKo === u.ko && PRESIDENT_ROLES.includes(x.role))
    if (l?.name) out[u.id] = l.name
  }
  return out
}

export function englishSource(
  request: { title?: string; guidance?: string; note?: string; seventyName?: string },
  presidents: Record<string, string>,
): EnglishTexts {
  return {
    title: request.title ?? '',
    guidance: request.guidance ?? '',
    note: request.note ?? '',
    seventy: request.seventyName ?? '',
    presidents,
  }
}

function sameTexts(a: EnglishTexts, b: EnglishTexts): boolean {
  const ak = Object.keys(a.presidents).sort()
  const bk = Object.keys(b.presidents).sort()
  return a.title === b.title && a.guidance === b.guidance && (a.note ?? '') === (b.note ?? '') && a.seventy === b.seventy
    && ak.length === bk.length && ak.every((k, i) => k === bk[i] && a.presidents[k] === b.presidents[k])
}

/** 저장된 영어가 지금 원문을 옮긴 것인가 */
export function englishIsCurrent(english: RequestEnglish | undefined | null, source: EnglishTexts): english is RequestEnglish {
  return !!english?.source && sameTexts(english.source, source)
}

/** 제목·강조 사항·전할 말·칠십인만 원문과 같은가 — 공개 페이지는 회장 이름을 쓰지 않는다 */
export function englishForPage(
  english: RequestEnglish | undefined | null,
  request: { title?: string; guidance?: string; note?: string; seventyName?: string },
): { title: string; guidance: string; note: string; seventy: string } | null {
  const src = english?.source
  if (!src || src.title !== (request.title ?? '') || src.guidance !== (request.guidance ?? '')
    || (src.note ?? '') !== (request.note ?? '') || src.seventy !== (request.seventyName ?? '')) return null
  return { title: english.title, guidance: english.guidance, note: english.note ?? '', seventy: english.seventy }
}
