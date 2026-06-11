import { describe, it, expect } from 'vitest'
import { isSuperAdmin, canUseAdminTools } from './permissions'
import type { AppUser } from '@/types'

const mk = (role: AppUser['role']): AppUser => ({
  uid: 'u', email: 'e', name: 'n', role, createdAt: '2026-01-01',
})

describe('isSuperAdmin', () => {
  it('admin만 true', () => {
    expect(isSuperAdmin(mk('admin'))).toBe(true)
    expect(isSuperAdmin(mk('exec_secretary'))).toBe(false)
    expect(isSuperAdmin(mk('seventy'))).toBe(false)
    expect(isSuperAdmin(null)).toBe(false)
  })
})

describe('canUseAdminTools', () => {
  it('admin과 exec_secretary는 true', () => {
    expect(canUseAdminTools(mk('admin'))).toBe(true)
    expect(canUseAdminTools(mk('exec_secretary'))).toBe(true)
  })
  it('그 외는 false', () => {
    expect(canUseAdminTools(mk('seventy'))).toBe(false)
    expect(canUseAdminTools(mk('president'))).toBe(false)
    expect(canUseAdminTools(mk('pending'))).toBe(false)
    expect(canUseAdminTools(null)).toBe(false)
  })
})
