import { describe, it, expect } from 'vitest'
import {
  resolveAdminViewSeventyUid,
  resolveEffectiveScope,
  resolveScopedScheduleSeventyUid,
  SCOPE_ALL,
} from './scope'
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

  it('admin + 집행서기 보조역할 + 미선택 → 담당 칠십인 regionIds', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveEffectiveScope(admin, null, users)).toEqual({ regionIds: ['r3'], actingSeventyUid: 'sevB' })
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

describe('resolveAdminViewSeventyUid', () => {
  it('admin + 집행서기 보조역할은 기본 조회를 담당 칠십인으로 제한한다', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveAdminViewSeventyUid(admin, null)).toBe('sevB')
  })

  it('admin 명시 선택은 담당 칠십인 기본값보다 우선한다', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveAdminViewSeventyUid(admin, 'sevA')).toBe('sevA')
  })

  it('admin 전체 보기는 조회 칠십인 제한을 제거한다', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveAdminViewSeventyUid(admin, SCOPE_ALL)).toBeNull()
  })

  it('admin + 지역칠십인 보조역할은 본인 uid로 조회한다', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'seventy', regionIds: ['r1'] })
    expect(resolveAdminViewSeventyUid(admin, null)).toBe('a')
  })

  it('admin이 아니면 조회 칠십인 제한을 계산하지 않는다', () => {
    const es = u({ uid: 'es', role: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveAdminViewSeventyUid(es, null)).toBeNull()
  })
})

describe('resolveScopedScheduleSeventyUid', () => {
  it('admin + 집행서기 보조역할은 담당 칠십인 일정으로 제한한다', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveScopedScheduleSeventyUid(admin, null)).toBe('sevB')
  })

  it('admin 전체 보기는 일정 칠십인 제한을 제거한다', () => {
    const admin = u({ uid: 'a', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveScopedScheduleSeventyUid(admin, SCOPE_ALL)).toBeNull()
  })

  it('exec_secretary는 담당 칠십인 일정으로 제한한다', () => {
    const es = u({ uid: 'es', role: 'exec_secretary', assignedSeventyUid: 'sevB' })
    expect(resolveScopedScheduleSeventyUid(es, null)).toBe('sevB')
  })

  it('seventy는 본인 일정으로 제한한다', () => {
    const seventy = u({ uid: 'sevA', role: 'seventy', regionIds: ['r1'] })
    expect(resolveScopedScheduleSeventyUid(seventy, null)).toBe('sevA')
  })

  it('president는 칠십인 일정 제한을 계산하지 않는다', () => {
    const president = u({ uid: 'p', role: 'president' })
    expect(resolveScopedScheduleSeventyUid(president, null)).toBeNull()
  })
})
