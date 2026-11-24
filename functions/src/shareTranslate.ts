/**
 * 한국어 안내문을 교회 공식 문체의 영어 안내문으로 옮긴다(Claude).
 * {자리}는 그대로 두되 영어 이름({president} 등)으로 바꾸고, 하나라도 빠지면 한 번 더 묻는다.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { SHARE_TOKENS } from './shareTemplate'

export const TRANSLATE_MODEL = 'claude-opus-5-5'

const TOKEN_RE = /\{([^{}\n]+)\}/g
const byName = new Map(SHARE_TOKENS.flatMap((tk) => [[tk.ko, tk], [tk.en, tk]]))

/** 아는 {자리}를 영어 이름으로. 모르는 {…}는 그대로 둔다 */
export function toEnglishTokens(text: string): string {
  return text.replace(TOKEN_RE, (whole, name: string) => {
    const tk = byName.get(name.trim())
    return tk ? `{${tk.en}}` : whole
  })
}

function tokenKeys(text: string): string[] {
  return [...text.matchAll(TOKEN_RE)]
    .map((m) => byName.get(m[1].trim())?.key)
    .filter((k): k is NonNullable<typeof k> => !!k)
    .sort()
}

/** 두 안내문의 {자리}가 같은가 — 언어·순서는 상관없이, 개수까지 */
export function sameTokens(a: string, b: string): boolean {
  const x = tokenKeys(a)
  const y = tokenKeys(b)
  return x.length === y.length && x.every((k, i) => k === y[i])
}

const TOKEN_LIST = SHARE_TOKENS.map((tk) => `{${tk.ko}} -> {${tk.en}}`).join(', ')

const TRANSLATE_SYSTEM = `You translate short Korean messages written by a leader of The Church of Jesus Christ of Latter-day Saints in Korea into English. The message is sent in a group chat to stake and district presidents, asking them to recommend a ward for a visit by the Area Seventy.

Write the way the Church writes in English (follow the Church's official style guide):
- Use the full name of the Church when it is named: "The Church of Jesus Christ of Latter-day Saints" (later, "the Church" or "the restored Church"). Never "Mormon", "LDS", or "Mormon Church".
- Use the Church's standard terms: 지역 칠십인 -> Area Seventy; 칠십인 -> Seventy; 스테이크 -> stake; 지방부 -> district; 와드 -> ward; 지부 -> branch; 스테이크 회장 -> stake president; 지방부 회장 -> district president; 감독 -> bishop; 회장단 -> presidency; 성찬식 -> sacrament meeting; 금식 주일 -> fast Sunday; 대회 -> conference; 연차 대회 -> general conference; 성역/성역을 베풀다 -> ministry/minister; 장로 -> Elder; 형제 -> Brother; 자매 -> Sister.
- Titles are capitalized only directly before a name ("President Kim", "Elder Park"); otherwise lowercase ("the stake president", "your ward").
- Write a personal name in Hangul in the Latin alphabet, family name first, using the Revised Romanization of Korean (e.g. 박경렬 -> Park Kyungryeol). Put an honorific such as 장로님 before the name as a title ("Elder Park Kyungryeol").
- Keep the tone warm, respectful and plain, as from one priesthood leader to another. Keep it as short as the Korean. No exclamation marks, no emoji unless the Korean has them, no added greetings, sign-offs or content.
- Keep the line breaks of the Korean, line for line. Keep blank lines, bullets and symbols such as "※" (as "*") or "-".

Placeholders: the Korean contains tokens in braces that are filled in later. Keep every token exactly once per occurrence, written with its English name: ${TOKEN_LIST}. Put each where it reads naturally in English. Leave any other text in braces unchanged.

Return only the English message.`

const SCHEMA = {
  type: 'object',
  properties: { english: { type: 'string' } },
  required: ['english'],
  additionalProperties: false,
}

async function ask(client: Anthropic, messages: Anthropic.Beta.BetaMessageParam[]): Promise<string> {
  const message = await client.beta.messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: 4000,
    // 안전 분류기가 거절하면 서버가 기본 대체 모델로 다시 돌린다
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: TRANSLATE_SYSTEM,
    messages,
  })
  if (message.stop_reason === 'refusal') throw new Error('translate refused')
  const text = message.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('translate: no text')
  const english = (JSON.parse(text.text) as { english?: unknown }).english
  if (typeof english !== 'string' || !english.trim()) throw new Error('translate: empty')
  return toEnglishTokens(english.trim())
}

export async function translateShareTemplate(client: Anthropic, korean: string): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: korean }]
  const first = await ask(client, messages)
  if (sameTokens(korean, first)) return first
  // 자리가 빠지거나 늘었다 — 어떤 자리여야 하는지 알려 주고 한 번 더
  const want = toEnglishTokens(korean).match(TOKEN_RE)?.join(' ') ?? ''
  const second = await ask(client, [
    ...messages,
    { role: 'assistant', content: JSON.stringify({ english: first }) },
    { role: 'user', content: `The tokens do not match the Korean. Use exactly these tokens, each as many times as listed: ${want}` },
  ])
  if (sameTokens(korean, second)) return second
  throw new Error('translate: tokens do not match')
}
