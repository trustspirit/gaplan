import { describe, it, expect } from 'vitest'
import { buildVisitPlanSchedulePayload } from './publishVisitPlan'

const baseOpts = {
  seventyUid: 'sv1',
  presidentUid: null,
  planId: 'plan1',
  itemId: 'item1',
  projectId: null,
  createdBy: 'admin1',
}

describe('buildVisitPlanSchedulePayload', () => {
  it('일반 발행: location을 그 항목의 와드 이름으로 유도해 채운다', () => {
    const payload = buildVisitPlanSchedulePayload(
      { unitId: 'seoul-east-stake', wardName: '교문 와드', date: '2026-09-01', startTime: '10:00', endTime: '11:00' },
      baseOpts,
    )
    expect(payload.location).toBe('교문 와드')
  })

  // Regression: publishVisitPlan used to build a payload with no `location` key at
  // all, so re-publishing an already-linked item (`ref.update({ ...payload })`)
  // left a stale location untouched even though wardName/unitId were overwritten —
  // e.g. a visit backfilled to "교문 와드" that gets re-published against
  // "신촌 와드" used to keep announcing "교문 와드" on Google Calendar/Kakao/ICS.
  // The payload must always carry a location freshly derived from the NEW item,
  // so a caller that spreads `{ ...payload }` into an update can never leave one.
  it('재발행 시나리오: 다른 와드로 재발행하면 새 와드로 location이 따라간다', () => {
    const republished = buildVisitPlanSchedulePayload(
      { unitId: 'seoul-stake', wardName: '신촌 와드', date: '2026-09-01', startTime: '10:00', endTime: '11:00' },
      baseOpts,
    )
    expect(republished.location).toBe('신촌 와드')
    expect(republished.location).not.toBe('교문 와드')
  })

  it('와드 방문 타입/필수 필드를 그대로 싣는다', () => {
    const payload = buildVisitPlanSchedulePayload(
      { unitId: 'u1', wardName: '녹번 와드', date: '2026-09-01', startTime: '09:00', endTime: '10:00' },
      { ...baseOpts, presidentUid: 'pres1', projectId: 'proj1' },
    )
    expect(payload).toMatchObject({
      type: 'ward_visit',
      seventyUid: 'sv1',
      unitId: 'u1',
      wardName: '녹번 와드',
      presidentUid: 'pres1',
      status: 'confirmed',
      visitPlanId: 'plan1',
      visitPlanItemId: 'item1',
      projectId: 'proj1',
      createdBy: 'admin1',
    })
  })
})
