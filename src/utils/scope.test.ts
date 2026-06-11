import { describe, it, expect } from 'vitest'
import { resolveEffectiveScope } from './scope'
import type { AppUser } from '@/types'

const u = (over: Partial<AppUser>): AppUser => ({
  uid: 'self', email: 'e', name: 'n', role: 'seventy', createdAt: '2026-01-01', ...over,
})

const seventyA: AppUser = u({ uid: 'sevA', role: 'seventy', regionIds: ['r1', 'r2'] })
const seventyB: AppUser = u({ uid: 'sevB', role: 'seventy', regionIds: ['r3'] })
const users = [seventyA, seventyB]

describe('resolveEffectiveScope', () => {
  it('user 없으면 빈 스코프', () => {
    expect(resolveEffectiveScope(null, null, users)).toEqual({ regionIds: [], actingSeventyUid: null })
  })

  it('admin + 미선택 → 전체(null)', () => {
    const admin = u({ uid: 'a', role: 'admin' })
    expect(resolveEffectiveScope(admin, null, users)).toEqual({ regionIds: null, actingSeventyUid: null })
  })

  it('admin + 칠십인 선택 → 그 칠십인 regionIds', () => {
    const admin = u({ uid: 'a', role: 'admin' })
    expect(resolveEffectiveScope(admin, 'sevA', users)).toEqual({ regionIds: ['r1', 'r2'], actingSeventyUid: 'sevA' })
  })

  it('admin + 삭제된 칠십인 선택 → 전체 폴백', () => {
    const admin = u({ uid: 'a', role: 'admin' })
    expect(resolveEffectiveScope(admin, 'ghost', users)).toEqual({ regionIds: null, actingSeventyUid: null })
  })

  it('exec_secretary → 담당 칠십인 regionIds', () => {
    const es = u({ uid: 'es', role: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveEffectiveScope(es, null, users)).toEqual({ regionIds: ['r3'], actingSeventyUid: 'sevB' })
  })

  it('exec_secretary + 담당 칠십인 미배정 → 빈 스코프', () => {
    const es = u({ uid: 'es', role: 'exec_secretary' })
    expect(resolveEffectiveScope(es, null, users)).toEqual({ regionIds: [], actingSeventyUid: null })
  })

  it('exec_secretary + 담당 칠십인 삭제됨 → 빈 스코프', () => {
    const es = u({ uid: 'es', role: 'exec_secretary', assignedSeventyUid: 'ghost' })
    expect(resolveEffectiveScope(es, null, users)).toEqual({ regionIds: [], actingSeventyUid: null })
  })

  it('seventy → 본인 regionIds, 본인 uid', () => {
    const self = u({ uid: 'me', role: 'seventy', regionIds: ['r5'] })
    expect(resolveEffectiveScope(self, null, users)).toEqual({ regionIds: ['r5'], actingSeventyUid: 'me' })
  })

  it('seventy regionId만 있는 구버전 → 배열로', () => {
    const self = u({ uid: 'me', role: 'seventy', regionIds: undefined, regionId: 'r9' })
    expect(resolveEffectiveScope(self, null, users)).toEqual({ regionIds: ['r9'], actingSeventyUid: 'me' })
  })

  it('president 등 → 빈 스코프', () => {
    const p = u({ uid: 'p', role: 'president' })
    expect(resolveEffectiveScope(p, null, users)).toEqual({ regionIds: [], actingSeventyUid: null })
  })
})
