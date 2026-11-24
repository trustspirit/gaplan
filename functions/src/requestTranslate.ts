/**
 * 요청의 한국어 값을 교회 공식 문체의 영어로 옮긴다(Claude). 서버 전용 — 웹 앱은 requestEnglish.ts만 쓴다.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { EnglishTexts } from './requestEnglish'
import { CHURCH_STYLE, TRANSLATE_MODEL } from './shareTranslate'

const SYSTEM = `You translate a few short fields of a request into English. A leader of The Church of Jesus Christ of Latter-day Saints in Korea is asking stake and district presidents to recommend wards for a visit by an Area Seventy. The English goes into a message and a web page for presidents who read English.

${CHURCH_STYLE}

The fields:
- title: the name of the request (e.g. "2027년 1분기 와드 방문" -> "Ward Visits, First Quarter 2027"). Title case, short.
- guidance: a short note to the presidents shown at the top of the page. Translate it as written.
- note: a message to the presidents. Translate it as written, keeping its line breaks.
- seventy: the Area Seventy's personal name. Give the name only, romanized, family name first, no title (e.g. "박경렬" -> "Park Kyungryeol").
- presidents: each president's personal name. Name only, romanized, family name first, no title; keep each id.
If a field is already in English, return it unchanged. If a field is empty, return an empty string. Translate only; add nothing.`

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    guidance: { type: 'string' },
    note: { type: 'string' },
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
  required: ['title', 'guidance', 'note', 'seventy', 'presidents'],
  additionalProperties: false,
}

export async function translateRequestTexts(client: Anthropic, source: EnglishTexts): Promise<EnglishTexts> {
  const input = {
    title: source.title,
    guidance: source.guidance,
    note: source.note,
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
    title: string; guidance: string; note: string; seventy: string; presidents: { id: string; name: string }[]
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
    note: source.note ? out.note.trim() : '',
    seventy: source.seventy ? out.seventy.trim() : '',
    presidents,
  }
}
