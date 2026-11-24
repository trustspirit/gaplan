/**
 * 방문 요청의 스테이크별 일요일 배정을 Claude에게 검토받는다(reviewVisitPlan이 부른다).
 * 규칙 점검(checkPlanBalance)이 못 잡는 맥락 — 오래 방문받지 못한 와드가 빠졌는지, 한 스테이크에
 * 몰렸는지 — 을 몇 줄로 짚게 한다. 배정은 바꾸지 않는다.
 *
 * 보내는 것: 스테이크·와드 이름과 방문 기록, 일요일별 배정·확정·막힘의 종류.
 * 보내지 않는 것: 사람 이름(칠십인·회장), uid, 토큰, 일정 id, 일정·행사 제목.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { regionOfSunday, unitSundayOptions } from './unitSundays'
import type { BalanceIssue } from './visitPlanBalance'
import type { VisitRequestDoc, WardVisitStat } from './visitRequestLogic'
import type { SundayStatus } from './visitSundayAvailability'

export const REVIEW_MODEL = 'claude-opus-5-5'
const MAX_SUGGESTIONS = 5

export interface ReviewSuggestion {
  level: 'warn' | 'tip'
  text: string
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['warn', 'tip'] },
          text: { type: 'string' },
        },
        required: ['level', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
}

const REVIEW_SYSTEM = `당신은 교회 지역 칠십인의 와드 방문 계획을 검토하는 조수입니다.
칠십인은 분기 동안 일요일마다 와드/지부 한 곳을 방문합니다. 일요일마다 두 스테이크(1순위·예비)의 회장에게 방문할 와드를 추천받고, 칠십인이 하나를 확정합니다.
목표는 스테이크와 CC(조정 평의회)에 방문이 고르게 가고, 오래 방문받지 못한 와드가 먼저 방문받는 것입니다.

입력 JSON:
- sundays: 일요일별 CC 차례, 묻는 스테이크(asked), 추천 배정의 1순위/예비, 확정된 와드(decided), 칠십인이 못 가는 이유(seventyBusy), 그날 막힌 스테이크(blockedStakes)
- stakes: 스테이크별 CC, 묻는 일요일(askedSundays), 와드별 마지막 방문(lastVisit, null이면 기록 없음)·최근 12개월 방문 수·예정 방문(scheduled)
- ruleChecks: 화면에 이미 보이는 규칙 점검 결과

할 일: ruleChecks가 이미 말한 것은 되풀이하지 말고, 그 밖에 칠십인이 배정을 고칠 만한 점을 짚으세요.
예: 방문 기록이 없거나 오래된 와드가 많은 스테이크가 적게 배정됨, 최근에 방문받은 스테이크가 많이 배정됨, 같은 스테이크가 연달아 1순위, 예비가 한 스테이크로 몰림.
고칠 것이 없으면 suggestions를 비우거나 tip 하나로 괜찮다고 말하세요.

형식: 최대 ${MAX_SUGGESTIONS}개, 각각 한국어 한 문장. 날짜는 M/D, 스테이크·와드 이름은 입력 그대로. 바로 고쳐야 하면 warn, 참고면 tip.`

/** Claude에 보낼 계획 요약. 사람·비밀 값은 넣지 않는다(파일 머리말 참고). */
export function buildReviewPayload(input: {
  request: VisitRequestDoc
  wardStats: Record<string, WardVisitStat>
  status: Record<string, SundayStatus>
  issues: BalanceIssue[]
  today: string
}): object {
  const { request, wardStats, status, issues, today } = input
  const units = request.units ?? []
  const sundays = [...(request.sundays ?? [])].sort()
  const decisions = request.decisions ?? {}
  const roles = request.unitSundayRoles ?? {}
  const unitName = (id?: string) => units.find((u) => u.id === id)?.ko ?? ''
  const ccName = (id?: string) => (id ? (request.regions?.find((r) => r.id === id)?.name ?? id) : null)
  const base = { sundays, units, sundayRegions: request.sundayRegions, unitSundays: request.unitSundays, decisions }
  const asked = new Map(
    units.map((u) => [u.id, unitSundayOptions(base, u.id, status).filter((o) => o.selected).map((o) => o.date)]),
  )

  return {
    today,
    sundays: sundays.map((date) => {
      const d = decisions[date]
      const st = status[date]
      return {
        date,
        cc: ccName(regionOfSunday({ units, sundayRegions: request.sundayRegions }, date)),
        asked: units.filter((u) => asked.get(u.id)?.includes(date)).map((u) => u.ko),
        primary: unitName(roles[date]?.primary) || undefined,
        backup: unitName(roles[date]?.backup) || undefined,
        decided: d ? `${unitName(d.unitId)} ${d.wardName}` : undefined,
        seventyBusy: (st?.busy ?? []).map((b) => b.kind),
        blockedStakes: Object.keys(st?.unitBlocks ?? {}).map(unitName).filter(Boolean),
      }
    }),
    stakes: units.map((u) => ({
      name: u.ko,
      cc: ccName(u.regionId),
      askedSundays: asked.get(u.id) ?? [],
      wards: u.wards.map((w) => ({
        name: w.ko,
        lastVisit: wardStats[w.id]?.lastVisit ?? null,
        count12m: wardStats[w.id]?.count12m ?? 0,
        scheduled: wardStats[w.id]?.nextVisit ?? null,
      })),
    })),
    ruleChecks: issues.map((i) => ({
      level: i.level,
      kind: i.kind,
      date: i.date,
      stake: i.unitId ? unitName(i.unitId) : undefined,
      cc: i.regionId ? ccName(i.regionId) : undefined,
      count: i.count,
      expected: i.expected,
    })),
  }
}

/** 구조화 응답을 읽는다. 스키마에 맞지 않으면 던진다. */
export function parseReview(text: string): ReviewSuggestion[] {
  const data = JSON.parse(text) as { suggestions?: unknown }
  if (!Array.isArray(data.suggestions)) throw new Error('bad review: suggestions')
  return data.suggestions.slice(0, MAX_SUGGESTIONS).map((s) => {
    const item = s as { level?: unknown; text?: unknown }
    if ((item.level !== 'warn' && item.level !== 'tip') || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error('bad review: item')
    }
    return { level: item.level, text: item.text.trim() }
  })
}

export async function reviewPlan(client: Anthropic, payload: object): Promise<ReviewSuggestion[]> {
  const message = await client.beta.messages.create({
    model: REVIEW_MODEL,
    max_tokens: 4000,
    // 안전 분류기가 거절하면 서버가 기본 대체 모델로 다시 돌린다
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: REVIEW_SCHEMA } },
    system: REVIEW_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  })
  if (message.stop_reason === 'refusal') throw new Error('review refused')
  const text = message.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('review: no text')
  return parseReview(text.text)
}
