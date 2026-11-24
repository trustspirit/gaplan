/**
 * 짧은 한국어 이름들(행사·일정·CC 이름)을 영어로 옮긴다(Claude). 서버 전용.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { CHURCH_STYLE, TRANSLATE_MODEL } from './shareTranslate'

/** 한 번에 옮길 최대 개수 — 요청 하나의 일요일들에 걸린 행사로는 넉넉하다 */
export const TEXTS_MAX = 60

const SYSTEM = `You translate short Korean labels into English for a web page read by stake and district presidents of The Church of Jesus Christ of Latter-day Saints. The labels are names of Church events and meetings on a calendar (e.g. "미군 지방부 대회" -> "U.S. Military District Conference", "스테이크 대회" -> "Stake Conference") and names of areas or units (e.g. "서울 CC" -> "Seoul CC").

${CHURCH_STYLE}

Keep each label as short as the Korean, in title case for event names. Romanize place names with the Revised Romanization of Korean (e.g. 서울 남 -> Seoul South, 강릉 -> Gangneung). Keep any English, numbers and abbreviations as they are. Return one English label for each Korean label, in the same order.`

const SCHEMA = {
  type: 'object',
  properties: { english: { type: 'array', items: { type: 'string' } } },
  required: ['english'],
  additionalProperties: false,
}

/** 한국어 -> 영어. 개수가 맞지 않거나 빈 것은 빼고 돌려준다 */
export async function translateTexts(client: Anthropic, texts: string[]): Promise<Record<string, string>> {
  const list = texts.slice(0, TEXTS_MAX)
  if (!list.length) return {}
  const message = await client.beta.messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: 4000,
    // 안전 분류기가 거절하면 서버가 기본 대체 모델로 다시 돌린다
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(list) }],
  })
  if (message.stop_reason === 'refusal') throw new Error('translate refused')
  const text = message.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('translate: no text')
  const english = (JSON.parse(text.text) as { english: unknown[] }).english
  if (!Array.isArray(english) || english.length !== list.length) throw new Error('translate: count mismatch')
  const out: Record<string, string> = {}
  list.forEach((ko, i) => {
    const en = english[i]
    if (typeof en === 'string' && en.trim()) out[ko] = en.trim()
  })
  return out
}
