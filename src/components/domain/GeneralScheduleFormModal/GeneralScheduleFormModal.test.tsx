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
// dirty 판정·검증·저장 payload에 종료일을 반영한다. 날짜 두 칸은 달력 하나(DateRangePicker)로
// 합쳐졌다: 시작일을 누르고 종료일을 누른다. 달력 칸의 이름은 YYYY-MM-DD다.
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

  it('날짜 두 칸 대신 달력 하나로 고른다', () => {
    render(<GeneralScheduleFormModal initialDate="2026-09-03" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'generalSchedule.dateRangeLabel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2026-09-03' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByLabelText('generalSchedule.endDateLabel')).toBeNull()
  })

  it('시작일 다음에 종료일을 누르고 저장하면 payload에 endDate가 실린다', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-03" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '수련회' },
    })
    fireEvent.click(screen.getByRole('button', { name: '2026-09-04' }))
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() =>
      expect(createGeneralSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-09-03', endDate: '2026-09-04' }),
      ),
    )
  })

  // stripUndefined(generalScheduleService.ts)가 undefined 필드를 Firestore에 쓰기
  // 전에 걷어낸다 — 여기서는 모달이 빈 문자열이 아니라 undefined를 실어 보내는지만
  // 확인한다(startTime/endTime/description과 같은 기존 관례).
  it('종료일을 비워 두면 payload의 endDate가 undefined다(빈 문자열이 아니다)', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-06" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '금식 주일' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() => expect(createGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(createGeneralSchedule).mock.calls[0][0].endDate).toBeUndefined()
  })

  // 달력으로는 거꾸로 된 범위를 만들 수 없지만, 이미 저장된 깨진 데이터(종료일이 시작일보다
  // 빠름)를 그대로 다시 저장하게 두지는 않는다.
  it('종료일이 시작일보다 빠른 옛 데이터는 저장을 막고 오류를 보여준다', async () => {
    const { updateGeneralSchedule } = await import('@/services/generalScheduleService')
    render(
      <GeneralScheduleFormModal
        initialData={{
          id: 'g1',
          title: '수련회',
          date: '2026-09-03',
          endDate: '2026-09-01',
          category: 'conference',
          createdBy: 'test-uid',
          createdAt: '2026-08-01',
          isPublic: false,
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    expect(await screen.findByText('generalSchedule.errorEndDateBeforeStart')).toBeInTheDocument()
    expect(updateGeneralSchedule).not.toHaveBeenCalled()
  })

  // 관리자가 seventy의 행사를 고치면 작성자가 관리자로 바뀌어, 원래 작성자가 수정·삭제
  // 권한(createdBy 기준)을 잃었다.
  it('수정 저장은 작성자(createdBy)를 건드리지 않는다', async () => {
    const { updateGeneralSchedule } = await import('@/services/generalScheduleService')
    render(
      <GeneralScheduleFormModal
        initialData={{
          id: 'g1',
          title: '수련회',
          date: '2026-09-03',
          category: 'conference',
          createdBy: 'someone-else',
          createdAt: '2026-08-01',
          isPublic: false,
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() => expect(updateGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(updateGeneralSchedule).mock.calls[0][1]).not.toHaveProperty('createdBy')
  })

  it('달력에서 날짜만 고치고 닫으려 하면 dirty 확인을 묻는다', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '2026-09-04' }))
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

  it('집행서기는 공개 범위 선택과 지역 타겟을 볼 수 있다', () => {
    mocks.currentUser = {
      uid: 'exec-uid', email: 'exec@test.com', role: 'exec_secretary',
      name: '집행서기', createdAt: '2026-01-01',
    }
    render(<GeneralScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText('generalSchedule.visibilityLabel')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '서울 CC' })).toBeInTheDocument()
  })

  it('칠십인은 공개 범위 선택과 지역 타겟을 볼 수 없고, 저장 payload도 강제로 비공개다', async () => {
    mocks.currentUser = {
      uid: 'seventy-uid', email: 'seventy@test.com', role: 'seventy',
      name: '칠십인', regionId: 'seoul', createdAt: '2026-01-01',
    }
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-01" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText('generalSchedule.visibilityLabel')).toBeNull()
    expect(screen.queryByRole('checkbox', { name: '서울 CC' })).toBeNull()

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '지역 모임' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    expect(createGeneralSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false, seventyOnly: false, targetRegionIds: [] }),
    )
  })

  // 공개 범위는 셋 중 하나다. 칠십인 전용은 isPublic을 끄고 seventyOnly를 켠 채로 저장한다 —
  // seventyOnly를 모르는 경로가 이 행사를 비공개로 취급하게 하려는 것이다.
  it.each([
    ['public', { isPublic: true, seventyOnly: false }],
    ['seventy', { isPublic: false, seventyOnly: true }],
    ['private', { isPublic: false, seventyOnly: false }],
  ] as const)('집행서기가 공개 범위를 %s로 고르면 그에 맞는 두 필드로 저장한다', async (choice, fields) => {
    mocks.currentUser = {
      uid: 'exec-uid', email: 'exec@test.com', role: 'exec_secretary',
      name: '집행서기', createdAt: '2026-01-01',
    }
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-01" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), {
      target: { value: '지역 모임' },
    })
    fireEvent.change(screen.getByLabelText('generalSchedule.visibilityLabel'), {
      target: { value: choice },
    })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() =>
      expect(createGeneralSchedule).toHaveBeenCalledWith(expect.objectContaining(fields)),
    )
  })

  it('칠십인 전용 행사를 열면 공개 범위가 칠십인 전용으로 잡혀 있다', () => {
    mocks.currentUser = {
      uid: 'exec-uid', email: 'exec@test.com', role: 'exec_secretary',
      name: '집행서기', createdAt: '2026-01-01',
    }
    render(
      <GeneralScheduleFormModal
        initialData={{
          id: 'g1', title: '전용', date: '2026-09-03', category: 'other',
          createdBy: 'exec-uid', createdAt: '2026-08-01', isPublic: false, seventyOnly: true,
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('generalSchedule.visibilityLabel')).toHaveValue('seventy')
  })

  // 칠십인은 공개 범위를 못 바꾼다. 관리자가 칠십인 전용으로 해 둔 자기 행사를 칠십인이 고쳐
  // 저장할 때 그 표시가 꺼지면, 그 행사가 로그인한 회장에게 보이게 된다.
  it('칠십인이 칠십인 전용인 자기 행사를 고쳐 저장해도 칠십인 전용이 유지된다', async () => {
    mocks.currentUser = {
      uid: 'seventy-uid', email: 'seventy@test.com', role: 'seventy',
      name: '칠십인', regionId: 'seoul', createdAt: '2026-01-01',
    }
    const { updateGeneralSchedule } = await import('@/services/generalScheduleService')
    render(
      <GeneralScheduleFormModal
        initialData={{
          id: 'g1', title: '전용', date: '2026-09-03', category: 'other',
          createdBy: 'seventy-uid', createdAt: '2026-08-01', isPublic: false, seventyOnly: true,
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))

    await waitFor(() => expect(updateGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(updateGeneralSchedule).mock.calls[0][1]).toMatchObject({
      isPublic: false,
      seventyOnly: true,
    })
  })
})

// 칠십인 전용 메모는 설명과 다른 칸이다 — 설명은 회장과 공개 페이지에도 나간다.
describe('GeneralScheduleFormModal 칠십인 전용 메모', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'seventy-uid', email: 'seventy@test.com', role: 'seventy',
      name: '칠십인', regionId: 'seoul', createdAt: '2026-01-01',
    }
  })

  const existing = {
    id: 'g1', title: '수련회', date: '2026-09-03', category: 'conference' as const,
    createdBy: 'seventy-uid', createdAt: '2026-08-01', isPublic: false,
  }

  it('새 행사에 메모를 쓰면 행사와 함께 넘긴다', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-01" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), { target: { value: '모임' } })
    fireEvent.change(screen.getByLabelText('generalSchedule.seventyNotesLabel'), { target: { value: ' 전용 메모 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))
    await waitFor(() => expect(createGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(createGeneralSchedule).mock.calls[0][1]).toBe('전용 메모')
    expect(vi.mocked(createGeneralSchedule).mock.calls[0][0]).not.toHaveProperty('seventyNotes')
  })

  it('건드리지 않은 메모는 수정 저장에서 넘기지 않는다', async () => {
    const { updateGeneralSchedule } = await import('@/services/generalScheduleService')
    render(
      <GeneralScheduleFormModal
        initialData={{ ...existing, seventyNotes: '전용 메모' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('generalSchedule.seventyNotesLabel')).toHaveValue('전용 메모')
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))
    await waitFor(() => expect(updateGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(updateGeneralSchedule).mock.calls[0][2]).toBeUndefined()
  })

  it('메모를 비우면 지우라고 넘긴다', async () => {
    const { updateGeneralSchedule } = await import('@/services/generalScheduleService')
    render(
      <GeneralScheduleFormModal
        initialData={{ ...existing, seventyNotes: '전용 메모' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('generalSchedule.seventyNotesLabel'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))
    await waitFor(() => expect(updateGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(updateGeneralSchedule).mock.calls[0][2]).toEqual({ notes: null, date: '2026-09-03' })
  })
})

// 담당 지역 칠십인의 참석 여부 — 공개 페이지에도 배지로 나가는 값이다.
describe('GeneralScheduleFormModal 담당 지역 칠십인 참석', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'seventy-uid', email: 'seventy@test.com', role: 'seventy',
      name: '칠십인', regionId: 'seoul', createdAt: '2026-01-01',
    }
  })

  it('체크하지 않으면 false로, 체크하면 true로 저장한다', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-01" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), { target: { value: '대회' } })
    fireEvent.click(screen.getByLabelText('generalSchedule.seventyAttendsLabel'))
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))
    await waitFor(() => expect(createGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(createGeneralSchedule).mock.calls[0][0]).toMatchObject({ seventyAttends: true })
  })

  it('참석으로 표시된 행사를 열면 체크되어 있다', () => {
    render(
      <GeneralScheduleFormModal
        initialData={{
          id: 'g1', title: '대회', date: '2026-09-03', category: 'conference',
          createdBy: 'seventy-uid', createdAt: '2026-08-01', isPublic: false, seventyAttends: true,
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('generalSchedule.seventyAttendsLabel')).toBeChecked()
  })
})

// 카테고리 셀렉트에는 고를 수 있는 빈 선택지("선택하세요")가 있다. 빈 카테고리로 저장되면
// 목록이 그 행사의 아이콘을 못 찾는다 — '기타'로 저장한다.
describe('GeneralScheduleFormModal 빈 카테고리', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'seventy-uid', email: 'seventy@test.com', role: 'seventy',
      name: '칠십인', regionId: 'seoul', createdAt: '2026-01-01',
    }
  })

  it('빈 선택지를 고른 채 저장하면 기타로 저장한다', async () => {
    const { createGeneralSchedule } = await import('@/services/generalScheduleService')
    render(<GeneralScheduleFormModal initialDate="2026-09-01" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('generalSchedule.titleLabel'), { target: { value: '대회' } })
    fireEvent.change(screen.getByLabelText('generalSchedule.categoryLabel'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.saveBtn' }))
    await waitFor(() => expect(createGeneralSchedule).toHaveBeenCalled())
    expect(vi.mocked(createGeneralSchedule).mock.calls[0][0]).toMatchObject({ category: 'other' })
  })
})

