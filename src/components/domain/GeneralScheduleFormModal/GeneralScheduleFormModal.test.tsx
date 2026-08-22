import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

// event-toast-and-multiday brief §2-4: 행사는 1박 2일 등 여러 날에 걸칠 수 있다 —
// 종료일(선택) 입력을 추가하고, dirty 판정·검증·저장 payload에 반영한다.
describe('GeneralScheduleFormModal 여러 날 행사(종료일)', () => {
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

  it('종료일(선택) 입력칸이 있다', () => {
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText('generalSchedule.endDateLabel')).toBeInTheDocument()
  })

  it('종료일을 채우고 저장하면 payload에 endDate가 실린다', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '수련회' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.dateLabel'), {
      target: { value: '2026-09-03' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.endDateLabel'), {
      target: { value: '2026-09-04' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() =>
      expect(createGeneralSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: '2026-09-04' }),
      ),
    )
  })

  // stripUndefined(generalScheduleService.ts)가 undefined 필드를 Firestore에 쓰기
  // 전에 걷어낸다 — 여기서는 모달이 빈 문자열이 아니라 undefined를 실어 보내는지만
  // 확인한다(startTime/endTime/description과 같은 기존 관례).
  it('종료일을 비워 두면 payload의 endDate가 undefined다(빈 문자열이 아니다)', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '금식 주일' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.dateLabel'), {
      target: { value: '2026-09-06' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() => expect(createGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(createGeneralSchedule).mock.calls[0][0].endDate).toBeUndefined()
  })

  it('종료일이 시작일보다 빠르면 저장을 막고 오류를 보여준다', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '수련회' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.dateLabel'), {
      target: { value: '2026-09-03' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.endDateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    expect(await screen.findByText('generalSchedule.errorEndDateBeforeStart')).toBeInTheDocument()
    expect(createGeneralSchedule).not.toHaveBeenCalled()
  })

  it('종료일만 고치고 닫으려 하면 dirty 확인을 묻는다', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onClose = vi.fn()
    render(
      <GeneralScheduleFormModal
        initialData={{
          id: 'g1',
          title: '수련회',
          date: '2026-09-03',
          category: 'conference',
          createdBy: 'admin',
          createdAt: '2026-08-01',
          isPublic: false,
        }}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('generalSchedule.endDateLabel'), {
      target: { value: '2026-09-04' },
    })
    fireEvent.click(screen.getByLabelText('common.close'))
    expect(confirmSpy).toHaveBeenCalledWith('common.discardChanges')
    expect(onClose).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

// public-general-schedules brief §2: 공개설정 권한은 canUseAdminTools(admin + exec_secretary)로
// 통일한다. 문자열로 'admin'만 비교하면 집행서기가 조용히 빠진다.
describe('GeneralScheduleFormModal 공개설정 권한', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('집행서기는 공개 체크박스와 지역 타겟을 볼 수 있다', () => {
    mocks.currentUser = {
      uid: 'exec-uid', email: 'exec@test.com', role: 'exec_secretary',
      name: '집행서기', createdAt: '2026-01-01',
    }
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText('generalSchedule.isPublicLabel')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '서울 CC' })).toBeInTheDocument()
  })

  it('칠십인은 공개 체크박스와 지역 타겟을 볼 수 없고, 저장 payload도 강제로 비공개다', async () => {
    mocks.currentUser = {
      uid: 'seventy-uid', email: 'seventy@test.com', role: 'seventy',
      name: '칠십인', regionId: 'seoul', createdAt: '2026-01-01',
    }
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText('generalSchedule.isPublicLabel')).toBeNull()
    expect(screen.queryByRole('checkbox', { name: '서울 CC' })).toBeNull()

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '지역 모임' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    expect(createGeneralSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false, targetRegionIds: [] }),
    )
  })
})
