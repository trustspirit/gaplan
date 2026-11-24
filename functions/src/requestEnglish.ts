/**
 * 영어로 보내는 스테이크를 위해 요청의 한국어 값(제목·강조 사항·칠십인 이름·회장 이름)을
 * 교회 공식 문체의 영어로 옮겨 둔다. 옮긴 때의 원문(source)을 같이 두어, 원문이 바뀌면 다시 옮긴다.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { CHURCH_STYLE, TRANSLATE_MODEL } from './shareTranslate'

export interface EnglishTexts {
  title: string
  guidance: string
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
  request: { title?: string; guidance?: string; seventyName?: string },
  presidents: Record<string, string>,
): EnglishTexts {
  return {
    title: request.title ?? '',
    guidance: request.guidance ?? '',
    seventy: request.seventyName ?? '',
    presidents,
  }
}

function sameTexts(a: EnglishTexts, b: EnglishTexts): boolean {
  const ak = Object.keys(a.presidents).sort()
  const bk = Object.keys(b.presidents).sort()
  return a.title === b.title && a.guidance === b.guidance && a.seventy === b.seventy
    && ak.length === bk.length && ak.every((k, i) => k === bk[i] && a.presidents[k] === b.presidents[k])
}

/** 저장된 영어가 지금 원문을 옮긴 것인가 */
export function englishIsCurrent(english: RequestEnglish | undefined | null, source: EnglishTexts): english is RequestEnglish {
  return !!english?.source && sameTexts(english.source, source)
}

/** 제목·강조 사항·칠십인만 원문과 같은가 — 공개 페이지는 회장 이름을 쓰지 않는다 */
export function englishForPage(
  english: RequestEnglish | undefined | null,
  request: { title?: string; guidance?: string; seventyName?: string },
): { title: string; guidance: string; seventy: string } | null {
  const src = english?.source
  if (!src || src.title !== (request.title ?? '') || src.guidance !== (request.guidance ?? '')
    || src.seventy !== (request.seventyName ?? '')) return null
  return { title: english.title, guidance: english.guidance, seventy: english.seventy }
}

const SYSTEM = `You translate a few short fields of a request into English. A leader of The Church of Jesus Christ of Latter-day Saints in Korea is asking stake and district presidents to recommend wards for a visit by an Area Seventy. The English goes into a message and a web page for presidents who read English.

${CHURCH_STYLE}

The fields:
- title: the name of the request (e.g. "2027년 1분기 와드 방문" -> "Ward Visits, First Quarter 2027"). Title case, short.
- guidance: a note to the presidents. Translate it as a full sentence or two.
- seventy: the Area Seventy's personal name. Give the name only, romanized, family name first, no title (e.g. "박경렬" -> "Park Kyungryeol").
- presidents: each president's personal name. Name only, romanized, family name first, no title; keep each id.
If a field is already in English, return it unchanged. If a field is empty, return an empty string. Translate only; add nothing.`

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    guidance: { type: 'string' },
    seventy: { type: 'string' },
    presidents: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'name'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'guidance', 'seventy', 'presidents'],
  additionalProperties: false,
}

export async function translateRequestTexts(client: Anthropic, source: EnglishTexts): Promise<EnglishTexts> {
  const input = {
    title: source.title,
    guidance: source.guidance,
    seventy: source.seventy,
    presidents: Object.entries(source.presidents).map(([id, name]) => ({ id, name })),
  }
  const message = await client.beta.messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: 4000,
    // 안전 분류기가 거절하면 서버가 기본 대체 모델로 다시 돌린다
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  })
  if (message.stop_reason === 'refusal') throw new Error('translate refused')
  const text = message.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('translate: no text')
  const out = JSON.parse(text.text) as {
    title: string; guidance: string; seventy: string; presidents: { id: string; name: string }[]
  }
  const presidents: Record<string, string> = {}
  for (const id of Object.keys(source.presidents)) {
    const name = out.presidents.find((p) => p.id === id)?.name.trim()
    if (!name) throw new Error(`translate: no name for ${id}`)
    presidents[id] = name
  }
  // 원문이 빈 칸은 영어도 빈 칸 — 모델이 무엇을 채웠든
  return {
    title: source.title ? out.title.trim() : '',
    guidance: source.guidance ? out.guidance.trim() : '',
    seventy: source.seventy ? out.seventy.trim() : '',
    presidents,
  }
}
