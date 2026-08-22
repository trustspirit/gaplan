import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { AppUser } from '@/types'

const mocks = vi.hoisted(() => ({
  currentUser: {
    uid: 'test-uid',
    email: 'test@test.com',
    role: 'seventy',
    name: '테스트',
    regionId: 'seoul',
    createdAt: '2026-01-01',
  } as AppUser,
}))

vi.mock('jotai', () => ({
  useAtomValue: vi.fn(() => mocks.currentUser),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/services/generalScheduleService', () => ({
  createGeneralSchedule: vi.fn().mockResolvedValue(undefined),
  updateGeneralSchedule: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

import { GeneralScheduleFormModal } from './GeneralScheduleFormModal'

// end-time-autofill-brief.md §4 회귀 테스트 4: 행사 폼은 WhenSection을 쓰지 않는 별도의 오래된
// 모달이라 자체 useState 배선이 필요하다 — 실제로 시작 Input에 값을 넣으면 종료 Input이
// 채워지는지 핀으로 박는다.
describe('GeneralScheduleFormModal 시작 시간 자동 종료 채움', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'test-uid',
      email: 'test@test.com',
      role: 'seventy',
      name: '테스트',
      regionId: 'seoul',
      createdAt: '2026-01-01',
    }
  })

  it('시작을 09:00으로 입력하면 종료가 11:00으로 채워진다(기본 2시간)', () => {
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('generalSchedule.startTimeLabel'), {
      target: { value: '09:00' },
    })
    expect(screen.getByLabelText('generalSchedule.endTimeLabel')).toHaveValue('11:00')
  })
})

// add-schedule-chooser Task 4: 뒤로 가기는 닫기와 같은 dirty 확인을 태워야 한다 —
// ScheduleFormModal의 requestBack과 같은 규칙.
describe('GeneralScheduleFormModal 뒤로 가기', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'test-uid',
      email: 'test@test.com',
      role: 'seventy',
      name: '테스트',
      regionId: 'seoul',
      createdAt: '2026-01-01',
    }
  })

  it('onBack이 없으면 뒤로 버튼을 렌더하지 않는다', () => {
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'common.back' })).toBeNull()
  })

  it('입력이 없으면 뒤로를 눌러 바로 onBack이 불린다', () => {
    const onBack = vi.fn()
    render(<GeneralScheduleFormModal onBack={onBack} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('입력이 있는 상태에서 뒤로를 누르면 확인을 묻고, 취소하면 onBack을 부르지 않는다', () => {
    const onBack = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<GeneralScheduleFormModal onBack={onBack} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '컨퍼런스' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(confirmSpy).toHaveBeenCalledWith('common.discardChanges')
    expect(onBack).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('확인 대화상자에서 승인하면 onBack이 불린다', () => {
    const onBack = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<GeneralScheduleFormModal onBack={onBack} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '컨퍼런스' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(onBack).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
