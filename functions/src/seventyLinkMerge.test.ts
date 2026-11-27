import { describe, it, expect } from 'vitest'
import { planSeventyLinkMove } from './seventyLinkMerge'

describe('planSeventyLinkMove', () => {
  it('미리 등록된 칠십인의 개인 링크를 진짜 uid로 옮기고, 같은 토큰이 새 범위를 가리키게 한다', () => {
    const plan = planSeventyLinkMove(
      'pre1',
      'real1',
      { 'seventy:pre1': { enabled: true, token: 'tok' }, 'seoul-stake': { enabled: true, token: 's' } },
      { schedulePublic: true, globalToken: '' },
    )
    expect(plan).toEqual({
      oldScopeId: 'seventy:pre1',
      newScopeId: 'seventy:real1',
      state: { enabled: true, token: 'tok' },
      moveGlobalPointer: false,
    })
  })

  it('전체 링크가 그 칠십인에게 옮겨 간 기록도 진짜 uid로 바꾸라고 알린다', () => {
    const plan = planSeventyLinkMove(
      'pre1',
      'real1',
      { 'seventy:pre1': { enabled: true, token: 'gtok' } },
      { globalToken: '', globalTokenMovedTo: 'seventy:pre1' },
    )
    expect(plan?.moveGlobalPointer).toBe(true)
  })

  it('개인 링크가 없으면 옮길 것이 없다', () => {
    expect(planSeventyLinkMove('pre1', 'real1', { 'seoul-stake': { enabled: true, token: 's' } }, {})).toBeNull()
    expect(planSeventyLinkMove('pre1', 'real1', undefined, undefined)).toBeNull()
  })

  it('꺼져 있는 링크도 토큰과 함께 옮긴다 — 다시 켰을 때 같은 주소여야 한다', () => {
    const plan = planSeventyLinkMove('pre1', 'real1', { 'seventy:pre1': { enabled: false, token: 'tok' } }, {})
    expect(plan?.state).toEqual({ enabled: false, token: 'tok' })
  })
})
