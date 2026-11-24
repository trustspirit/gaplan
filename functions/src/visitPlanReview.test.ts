import { describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { buildReviewPayload, parseReview, reviewPlan, REVIEW_MODEL } from './visitPlanReview'
import type { VisitRequestDoc } from './visitRequestLogic'

const request: VisitRequestDoc = {
  title: '1월 방문',
  seventyUid: 'seventy-uid-123',
  seventyName: '김칠십',
  sundays: ['2027-01-10', '2027-01-17'],
  units: [
    { id: 'u1', ko: '서울 스테이크', en: '', regionId: 'seoul', wards: [{ id: 'w1', ko: '녹번 와드', en: '' }] },
    { id: 'u2', ko: '서울동 스테이크', en: '', regionId: 'seoul', wards: [{ id: 'w2', ko: '교문 와드', en: '' }] },
  ],
  unitTokens: { u1: 'secret-token-aaaa', u2: 'secret-token-bbbb' },
  unitSundays: { u1: ['2027-01-10'], u2: ['2027-01-10', '2027-01-17'] },
  decisions: {
    '2027-01-17': { unitId: 'u2', wardId: 'w2', wardName: '교문 와드', scheduleId: 'vr_secret_schedule' },
  },
}

const payload = () =>
  buildReviewPayload({
    request,
    wardStats: { w1: { lastVisit: null, nextVisit: null, count12m: 0 }, w2: { lastVisit: '2026-05-01', nextVisit: '2027-01-17', count12m: 1 } },
    status: {
      '2027-01-10': {
        busy: [{ kind: 'schedule', scheduleType: 'meeting', label: '비밀 회의 제목', publicLabel: false }],
        notes: [{ title: '공개 행사', unitIds: null }],
        unitBlocks: { u1: '서울 스테이크 대회' },
        councilRegionId: null,
      },
    },
    issues: [{ level: 'info', kind: 'sundayNoBackup', date: '2027-01-10', unitId: 'u1' }],
    today: '2026-11-24',
  })

describe('buildReviewPayload', () => {
  it('keeps names of stakes and wards but no people, tokens, ids or schedule titles', () => {
    const json = JSON.stringify(payload())
    for (const secret of ['김칠십', 'seventy-uid-123', 'secret-token', 'vr_secret_schedule', '비밀 회의 제목', '서울 스테이크 대회']) {
      expect(json).not.toContain(secret)
    }
    for (const name of ['서울 스테이크', '녹번 와드', '교문 와드']) expect(json).toContain(name)
  })

  it('tells which Sundays each stake is asked about and what is decided', () => {
    const p = payload() as { stakes: { name: string; askedSundays: string[] }[]; sundays: { date: string; decided?: string }[] }
    // 1/10은 칠십인이 못 가는 날이라 묻는 날에서 빠진다(회장 링크에서도 고를 수 없다)
    expect(p.stakes.find((s) => s.name === '서울동 스테이크')?.askedSundays).toEqual(['2027-01-17'])
    expect(p.sundays.find((s) => s.date === '2027-01-17')?.decided).toBe('서울동 스테이크 교문 와드')
  })
})

describe('parseReview', () => {
  it('reads the suggestions', () => {
    expect(parseReview('{"suggestions":[{"level":"tip","text":"녹번 와드를 먼저"}]}')).toEqual([
      { level: 'tip', text: '녹번 와드를 먼저' },
    ])
  })
  it('rejects a reply that does not match the schema', () => {
    expect(() => parseReview('{"suggestions":[{"level":"loud","text":"x"}]}')).toThrow()
    expect(() => parseReview('{"suggestions":[{"level":"tip"}]}')).toThrow()
    expect(() => parseReview('not json')).toThrow()
  })
  it('keeps at most five', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ level: 'tip', text: `t${i}` }))
    expect(parseReview(JSON.stringify({ suggestions: many }))).toHaveLength(5)
  })
})

describe('reviewPlan', () => {
  const clientReturning = (message: unknown) => {
    const create = vi.fn().mockResolvedValue(message)
    return { client: { beta: { messages: { create } } } as unknown as Anthropic, create }
  }

  it('asks Claude Opus 5.5 with server-side fallback and structured output', async () => {
    const { client, create } = clientReturning({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '{"suggestions":[{"level":"warn","text":"a"}]}' }],
    })
    await expect(reviewPlan(client, { x: 1 })).resolves.toEqual([{ level: 'warn', text: 'a' }])
    const params = create.mock.calls[0][0]
    expect(REVIEW_MODEL).toBe('claude-opus-5-5')
    expect(params.model).toBe('claude-opus-5-5')
    expect(params.fallbacks).toBe('default')
    expect(params.betas).toContain('server-side-fallback-2026-07-01')
    expect(params.output_config.format.type).toBe('json_schema')
    expect(params.output_config.effort).toBe('low')
  })

  it('fails on a refusal', async () => {
    const { client } = clientReturning({ stop_reason: 'refusal', content: [] })
    await expect(reviewPlan(client, {})).rejects.toThrow()
  })
})
