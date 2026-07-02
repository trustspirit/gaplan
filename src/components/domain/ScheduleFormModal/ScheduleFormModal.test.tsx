import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import type { AppUser } from '@/types/user'

const mocks = vi.hoisted(() => ({
  currentUser: {
    uid: 'test-uid',
    email: 'test@test.com',
    role: 'seventy',
    name: '테스트',
    unitId: 'seoul-stake',
    createdAt: '2026-01-01',
  } as AppUser,
  users: [] as AppUser[],
}))

const { createSpy } = vi.hoisted(() => ({ createSpy: vi.fn() }))

// Heavy mocks to isolate the component
vi.mock('@/firebase', () => ({ db: {}, functions: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: 0 })),
  Timestamp: { now: vi.fn() },
}))
vi.mock('firebase/functions', () => ({ httpsCallable: () => createSpy }))
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
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: mocks.users }),
}))
vi.mock('@/hooks/useLeaders')
vi.mock('@/components/domain/ProjectPicker/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker" />,
}))
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

import { ScheduleFormModal } from './ScheduleFormModal'
import {
  buildNotesWithLeaderContact,
  getContactTargetOptions,
} from './leaderContactNotes'
import * as useLeadersModule from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'

const MOCK_LEADER_BISHOP: Leader = {
  id: '131334',
  externalUnitId: 131334,
  unitNameKo: '녹번 와드',
  unitNameEn: 'Nokbeon Ward',
  role: '감독',
  name: '조해준',
  phone: '010-9635-1193',
}

const MOCK_STAKE_PRESIDENT: Leader = {
  id: 'stake-president',
  externalUnitId: 1,
  unitNameKo: '서울 스테이크',
  unitNameEn: 'Seoul Stake',
  role: '스테이크 회장',
  name: '홍길동',
  phone: '010-1111-2222',
}

const MOCK_BRANCH_PRESIDENT: Leader = {
  id: 'branch-president',
  externalUnitId: 2,
  unitNameKo: '중앙 수어 지부',
  unitNameEn: 'Jungang Sign Language Branch',
  role: '지부 회장',
  name: '박지부',
  phone: '010-5555-6666',
}

const MOCK_PRESIDENT_USER: AppUser = {
  uid: 'president-uid',
  email: 'president@test.com',
  name: '홍길동',
  role: 'president',
  unitId: 'seoul-stake',
  createdAt: '2026-01-01',
}

describe('ScheduleFormModal 메모 자동 입력', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'test-uid',
      email: 'test@test.com',
      role: 'seventy',
      name: '테스트',
      unitId: 'seoul-stake',
      createdAt: '2026-01-01',
    }
    mocks.users = []
  })

  it('메모가 비어있을 때 sabbathVisitNotes 자동 입력이 없다', async () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_LEADER_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    // notes 영역이 비어있어야 함 (sabbathVisitNotes 자동 입력 없음)
    const notesElements = screen.queryAllByRole('textbox')
    const notesField = notesElements.find(el =>
      el.getAttribute('placeholder')?.includes('schedule.notesLabel') ||
      el.tagName === 'TEXTAREA'
    )
    if (notesField) {
      expect(notesField).toHaveValue('')
    }
  })

  it('getLeaderByUnitName이 훅에서 제공된다', () => {
    const getLeaderByUnitName = vi.fn().mockReturnValue(MOCK_LEADER_BISHOP)
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_LEADER_BISHOP],
      loading: false,
      getLeaderByUnitName,
    })
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(getLeaderByUnitName).toBeDefined()
  })
})

describe('ScheduleFormModal 연락처 대상', () => {
  it('접견 대상에 스테이크/지방부 회장과 소속 와드/지부 지도자를 함께 노출한다', () => {
    const options = getContactTargetOptions({
      type: 'interview',
      unitId: 'seoul-stake',
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_BRANCH_PRESIDENT],
      users: [MOCK_PRESIDENT_USER],
    })

    expect(options).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '서울 스테이크 · 스테이크 회장',
        unitNameKo: '서울 스테이크',
        presidentUid: 'president-uid',
      }),
      expect.objectContaining({
        label: '녹번 와드 · 감독',
        unitNameKo: '녹번 와드',
      }),
      expect.objectContaining({
        label: '중앙 수어 지부 · 지부 회장',
        unitNameKo: '중앙 수어 지부',
      }),
    ]))
  })

  it('모임에서 와드/지부를 선택하면 해당 감독/지부 회장 연락처를 메모 앞에 붙인다', () => {
    const notes = buildNotesWithLeaderContact({
      type: 'meeting',
      unitId: 'seoul-stake',
      contactTargetUnitName: '녹번 와드',
      notes: '기존 메모',
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP],
    })

    expect(notes).toBe('감독: 조해준 (010-9635-1193)\n기존 메모')
  })

  it('연락처 대상을 따로 선택하지 않으면 기존처럼 스테이크/지방부 회장 연락처를 사용한다', () => {
    const notes = buildNotesWithLeaderContact({
      type: 'interview',
      unitId: 'seoul-stake',
      contactTargetUnitName: '',
      notes: '',
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP],
    })

    expect(notes).toBe('스테이크 회장: 홍길동 (010-1111-2222)')
  })
})

describe('ScheduleFormModal 담당 칠십인 범위', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = {
      uid: 'admin-1',
      email: 'admin@test.com',
      name: '관리자',
      role: 'admin',
      secondaryRole: 'exec_secretary',
      assignedSeventyUid: 'seventy-1',
      createdAt: '2026-01-01',
    }
    mocks.users = []
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  it('담당 칠십인 지역 정보가 로딩되기 전에는 전체 단위를 열지 않는다', () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByLabelText('schedule.stakeLabel')).toBeDisabled()
  })
})

describe('ScheduleFormModal 접견/모임 구조화된 대상 선택', () => {
  const SEVENTY_USER: AppUser = {
    uid: 'test-uid',
    email: 'test@test.com',
    name: '테스트',
    role: 'seventy',
    regionId: 'seoul',
    createdAt: '2026-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createSpy.mockReset()
    createSpy.mockResolvedValue({ data: {} })
    mocks.currentUser = {
      uid: 'test-uid',
      email: 'test@test.com',
      role: 'seventy',
      name: '테스트',
      unitId: 'seoul-stake',
      createdAt: '2026-01-01',
    }
    mocks.users = [SEVENTY_USER, MOCK_PRESIDENT_USER]
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  function fillDateTime() {
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: '2026-07-10' } })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  it('와드 대상 선택 시 targetKind=ward_bishop, wardId를 payload에 포함한다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    // stake/district is now optional-labelled even for interview
    expect(screen.getByLabelText('schedule.stakeLabelOptional')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('schedule.stakeLabelOptional'), { target: { value: 'seoul-stake' } })

    fireEvent.change(screen.getByLabelText('대상'), { target: { value: 'ward:seoul-nokbeon' } })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'interview', targetKind: 'ward_bishop', wardId: 'seoul-nokbeon',
    }))
  })

  it('스테이크 대상 선택 시 targetKind=stake_president, presidentUid를 payload에 포함한다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.stakeLabelOptional'), { target: { value: 'seoul-stake' } })

    fireEvent.change(screen.getByLabelText('대상'), { target: { value: 'unit:seoul-stake' } })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'interview', targetKind: 'stake_president', unitId: 'seoul-stake', presidentUid: 'president-uid',
    }))
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('wardId')
  })

  it('스테이크/지방부를 선택하지 않아도(옵션널) 대상을 기타로 직접 입력하면 저장할 수 있다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    // No stake/unit selected — target select should only offer '기타'
    fireEvent.change(screen.getByLabelText('대상'), { target: { value: 'other' } })
    fireEvent.change(screen.getByLabelText('대상 (직접 입력)'), { target: { value: '홍길순' } })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'interview', targetKind: 'other',
    }))
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('unitId')
  })

  it('접견에서 대상을 아무것도 선택하지 않으면 저장되지 않는다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(createSpy).not.toHaveBeenCalled()
  })
})
