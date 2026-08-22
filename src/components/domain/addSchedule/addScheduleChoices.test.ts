import type { AppUser } from '@/types'
import { addScheduleChoicesFor } from './addScheduleChoices'

function user(over: Partial<AppUser>): AppUser {
  return {
    uid: 'u1',
    email: 'u1@test.com',
    name: '테스트',
    role: 'seventy',
    createdAt: '2026-01-01',
    ...over,
  }
}

describe('addScheduleChoicesFor', () => {
  it('admin에게는 일정 3종 + 행사를 이 순서로 준다', () => {
    expect(addScheduleChoicesFor(user({ role: 'admin' }))).toEqual([
      'ward_visit',
      'interview',
      'meeting',
      'general_schedule',
    ])
  })

  it('exec_secretary에게도 4개를 준다', () => {
    expect(addScheduleChoicesFor(user({ role: 'exec_secretary' }))).toEqual([
      'ward_visit',
      'interview',
      'meeting',
      'general_schedule',
    ])
  })

  it('seventy에게는 행사만 준다', () => {
    expect(addScheduleChoicesFor(user({ role: 'seventy' }))).toEqual(['general_schedule'])
  })

  it('그 외 역할에게는 아무것도 주지 않는다', () => {
    expect(addScheduleChoicesFor(user({ role: 'president' }))).toEqual([])
  })

  it('null에게는 아무것도 주지 않는다', () => {
    expect(addScheduleChoicesFor(null)).toEqual([])
  })
})
