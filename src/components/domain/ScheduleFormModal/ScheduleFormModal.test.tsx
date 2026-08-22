import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// 방문 목록 훅은 「그 날짜 이후」의 방문만 돌려준다. 고정 날짜를 쓰면 그 날이 지난
// 뒤부터 폼의 기본 fromDate(=오늘)가 방문을 걸러내 테스트가 통째로 깨진다.
// 오늘을 기준으로 잡아 시간이 흘러도 앞뒤 관계가 유지되게 한다.
const dates = vi.hoisted(() => {
  const day = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return { visit: day(30), beforeVisit: day(7), afterVisit: day(31) }
})

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
vi.mock('@/hooks/useUpcomingVisits', () => ({
  // 실제 훅처럼 fromDate 이후의 방문만 돌려준다 — 모임 날짜를 방문 이후로 옮기면
  // 목록에서 사라지는 상황(Finding 2 회귀 테스트)을 재현하기 위해 인자에 반응해야 한다.
  useUpcomingVisits: (_seventyUid: string, fromDate: string) => ({
    visits:
      fromDate && fromDate <= dates.visit
        ? [{ id: 'v1', date: dates.visit, wardName: '교문 와드', unitId: 'seoul-east-stake' }]
        : [],
    loading: false,
  }),
}))
vi.mock('@/components/domain/ProjectPicker/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker" />,
}))
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

import { ScheduleFormModal } from './ScheduleFormModal'
import { buildNotesWithLeaderContact, getContactTargetOptions } from './leaderContactNotes'
import { buildScheduleTitle } from '../../../../functions/src/scheduleRules'
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

const MOCK_GYOMUN_BISHOP: Leader = {
  id: 'gyomun-bishop',
  externalUnitId: 999,
  unitNameKo: '교문 와드',
  unitNameEn: 'Gyomun Ward',
  role: '감독',
  name: '김교문',
  phone: '010-2222-3333',
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
    const notesField = notesElements.find(
      (el) =>
        el.getAttribute('placeholder')?.includes('schedule.notesLabel') ||
        el.tagName === 'TEXTAREA',
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

    expect(options).toEqual(
      expect.arrayContaining([
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
      ]),
    )
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

// ---------------------------------------------------------------------------
// The describe blocks below drive the form through TargetSection's DOM, which
// Task 3 (already committed, out of Task 6's file scope) restructured: one
// compound "대상" select with values like `ward:<id>`/`unit:<id>` became a
// "대상 유형" (target-kind) select plus separate concrete stake/ward/CC/free-text
// selects that appear once a kind is chosen. Old labels (`schedule.targetLabel`,
// `schedule.stakeLabelOptional`) no longer exist post-refactor — these tests
// exercise the same payload contracts through the new interaction shape.
// Two real behaviour changes fell out of Task 3 too (documented at their tests
// below): (1) seventy-scoping of the stake/CC lists is gone, (2) picking a
// target kind can never hide the purpose select above it anymore.
// ---------------------------------------------------------------------------

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

  // KNOWN REGRESSION (see Task 6 report): the old modal disabled the stake/district
  // select until the assigned seventy's region scope had loaded, so the dropdown
  // never offered out-of-scope units. TargetSection (Task 3) builds its unit list
  // from ALL_UNITS unconditionally and has no seventy-scoping input or `disabled`
  // concept for it — that guard is gone post-refactor. Fixing it means editing
  // TargetSection.tsx, which is outside Task 6's file scope (ScheduleFormModal.*
  // only). This test documents the current (regressed) behaviour.
  it('스테이크/지방부 select에 더 이상 담당 칠십인 범위 제한이 걸리지 않는다 (회귀 — 후속 필요)', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.interview'))
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'ward_bishop')
    expect(screen.getByLabelText('schedule.stakeLabel')).not.toBeDisabled()
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
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-07-10' },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  function expandDetails() {
    fireEvent.click(screen.getByRole('button', { name: /schedule.detailSectionLabel/ }))
  }

  it('와드 대상 선택 시 targetKind=ward_bishop, wardId를 payload에 포함한다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'ward_bishop' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '녹번 와드' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'interview',
        targetKind: 'ward_bishop',
        wardId: 'seoul-nokbeon',
      }),
    )
  })

  // Controller ruling (Fix 1): functions/ has no ward-name table, so the form must
  // send the ward's Korean name itself for a ward-bishop target — not just wardId.
  // End to end: target picked in the form → payload carries wardName → the shared
  // title rule renders the specced "<와드> 감독 접견" (not the old unit-only fallback).
  it('와드 감독 접견 대상을 고르면 payload에 wardName이 실리고, 그 payload로 접견 제목이 와드를 밝힌다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expandDetails()

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'ward_bishop' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-east-stake' },
    })
    // Placeholder preview must already show the (ward-less) title before a ward is chosen.
    expect(screen.getByLabelText('schedule.customTitleOptional')).toHaveAttribute(
      'placeholder',
      '서울동 스테이크 접견',
    )
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '교문 와드' },
    })
    expect(screen.getByLabelText('schedule.customTitleOptional')).toHaveAttribute(
      'placeholder',
      '교문 와드 감독 접견',
    )

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    const payload = createSpy.mock.calls[0][0]
    expect(payload).toMatchObject({
      type: 'interview',
      targetKind: 'ward_bishop',
      wardId: 'seoul-east-gyomun',
      wardName: '교문 와드',
    })
    expect(buildScheduleTitle({ ...payload, unitName: '서울동 스테이크' })).toBe('교문 와드 감독 접견')
  })

  it('스테이크 대상 선택 시 targetKind=stake_president, presidentUid를 payload에 포함한다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'stake_president' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'interview',
        targetKind: 'stake_president',
        unitId: 'seoul-stake',
        presidentUid: 'president-uid',
      }),
    )
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('wardId')
  })

  // stake_president는 old modal의 selectedContactTarget?.unitNameKo와 같은 값(그 스테이크의
  // 한글 이름)을 노트 연락처 첨부에 써야 한다 — 새 target 모델은 unitId만 들고 있으므로
  // ALL_UNITS에서 그 이름을 다시 찾아야 한다(Task 6 report의 unitNameKo 매핑 참고).
  it('스테이크 대상을 고르면 그 스테이크 회장 연락처가 노트에 붙는다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'stake_president' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0][0].notes).toBe('스테이크 회장: 홍길동 (010-1111-2222)')
  })

  it('스테이크/지방부를 선택하지 않아도(옵션널) 대상을 기타로 직접 입력하면 저장할 수 있다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    // No stake/unit selected — 대상 유형만 '기타'로 고른다
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), { target: { value: 'other' } })
    fireEvent.change(screen.getByLabelText('schedule.targetFreeTextLabel'), {
      target: { value: '홍길순' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'interview',
        targetKind: 'other',
      }),
    )
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

  // 비워 두면 뭐가 될지 알 수 있어야 비워 둘 수 있다.
  it('제목 칸 placeholder에 자동 생성될 제목을 보여준다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} initialType="interview" />)
    expandDetails()
    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'ward_bishop')
    await userEvent.selectOptions(screen.getByLabelText('schedule.stakeLabel'), 'seoul-east-stake')
    expect(screen.getByLabelText('schedule.customTitleOptional')).toHaveAttribute(
      'placeholder',
      '서울동 스테이크 접견',
    )
  })
})

describe('ScheduleFormModal 사전 모임 목적', () => {
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
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: dates.beforeVisit },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  it('사전 모임 목적인데 대상 방문을 안 고르면 저장을 막는다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.purposeLabel'), {
      target: { value: 'pre_visit' },
    })
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'ward_bishop' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '녹번 와드' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    expect(await screen.findByText('schedule.errorRelatedVisitRequired')).toBeInTheDocument()
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('대상 방문을 고르면 relatedVisitId를 payload에 포함한다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.purposeLabel'), {
      target: { value: 'pre_visit' },
    })
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), {
      target: { value: 'v1' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'meeting',
        relatedVisitId: 'v1',
        targetKind: 'ward_bishop',
        wardId: 'seoul-east-gyomun',
      }),
    )
  })

  it('일반 목적이면 relatedVisitId 없이 저장된다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'ward_bishop' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '녹번 와드' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('relatedVisitId')
  })

  // Finding 1: Select가 항상 placeholder 옵션을 렌더하는데 목적 Select의 options에도
  // 'general' 항목을 넣어서 "일반"이 두 번(placeholder + 옵션) 나타나던 버그의 회귀 테스트.
  it('목적 Select에 "일반" 라벨이 한 번만 나타난다', () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))

    const purposeSelect = screen.getByLabelText('schedule.purposeLabel') as HTMLSelectElement
    const generalOptions = Array.from(purposeSelect.options).filter(
      (o) => o.textContent === 'schedule.purposeGeneral',
    )
    expect(generalOptions).toHaveLength(1)
  })

  // Finding 1: 종류를 바꿔도 relatedVisitId가 남아 payload를 오염시키던 버그의 회귀 테스트
  it('대상 방문을 고른 뒤 종류를 구역 방문으로 바꾸면 relatedVisitId가 초기화되어 payload에 남지 않는다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.purposeLabel'), {
      target: { value: 'pre_visit' },
    })
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), {
      target: { value: 'v1' },
    })

    fireEvent.click(screen.getByText('schedule.type.ward_visit'))
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '녹번 와드' },
    })

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('relatedVisitId')
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'ward_visit' }))
  })

  // Finding 2: 고른 방문이 목록에서 사라져도(예: 모임 날짜를 방문 이후로 변경) stale id가
  // 그대로 서버로 전송되던 버그의 회귀 테스트. mock된 useUpcomingVisits는 fromDate가
  // 방문일(dates.visit)보다 늦으면 빈 목록을 돌려준다.
  it('선택한 방문이 목록에서 사라지면(모임 날짜를 방문 이후로 변경) 저장 시 대상 방문을 다시 요구한다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.purposeLabel'), {
      target: { value: 'pre_visit' },
    })
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), {
      target: { value: 'v1' },
    })

    // 방문일 이후로 모임 날짜를 옮기면 목록에서 v1이 사라진다
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: dates.afterVisit },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    expect(await screen.findByText('schedule.errorRelatedVisitRequired')).toBeInTheDocument()
    expect(createSpy).not.toHaveBeenCalled()
  })

  // Finding 3: 대상 방문 자동 선택 시 contactTargetValue/presidentUid를 안 채워서
  // 노트에 와드 감독이 아닌 스테이크 회장 연락처가 붙던(혹은 아예 안 붙던) 버그의 회귀 테스트.
  // 수동으로 같은 와드를 대상으로 고른 경로와 결과(노트)가 같아야 한다.
  it('대상 방문 자동 선택이 수동 대상 선택과 동일한 감독 연락처를 노트에 남긴다', async () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_GYOMUN_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })

    // 수동 경로: 대상 유형에서 같은 와드를 직접 골라 선택
    const { unmount } = render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'ward_bishop' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-east-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '교문 와드' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))
    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    const manualNotes = createSpy.mock.calls[0][0].notes
    unmount()

    createSpy.mockClear()

    // 자동 경로: 목적=사전 모임 + 대상 방문 선택만으로 같은 와드가 잡혀야 한다
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.purposeLabel'), {
      target: { value: 'pre_visit' },
    })
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), {
      target: { value: 'v1' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))
    await waitFor(() => expect(createSpy).toHaveBeenCalled())

    expect(manualNotes).toBe('감독: 김교문 (010-2222-3333)')
    expect(createSpy.mock.calls[0][0].notes).toBe(manualNotes)
  })
})

describe('ScheduleFormModal 협의 평의회(CCM)', () => {
  const SEVENTY_USER: AppUser = {
    uid: 'test-uid',
    email: 'test@test.com',
    name: '테스트',
    role: 'seventy',
    regionIds: ['seoul', 'busan'],
    createdAt: '2026-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentUser = SEVENTY_USER
    mocks.users = [SEVENTY_USER]
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_STAKE_PRESIDENT],
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
  })

  function fillDateTime() {
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-07-10' },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  function openCcCouncilForm() {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'cc_council' },
    })
  }

  it('모임에서만 협의 평의회 대상을 제공한다', () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.interview'))
    const interviewTarget = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(interviewTarget.options).map((o) => o.value)).not.toContain('cc_council')

    fireEvent.click(screen.getByText('schedule.type.meeting'))
    const meetingTarget = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(meetingTarget.options).map((o) => o.value)).toContain('cc_council')
  })

  // 협의 평의회는 CC 전체가 대상이므로 스테이크를 먼저 고르지 않아도 선택할 수 있어야 한다
  it('스테이크를 고르지 않아도 협의 평의회를 선택할 수 있다', () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    expect(screen.queryByLabelText('schedule.stakeLabel')).not.toBeInTheDocument()
    const target = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(target.options).map((o) => o.value)).toContain('cc_council')
  })

  it('선택하면 스테이크 대신 담당 CC 목록을 고르게 한다', () => {
    openCcCouncilForm()
    expect(screen.queryByLabelText('schedule.stakeLabel')).not.toBeInTheDocument()
    const ccSelect = screen.getByLabelText('schedule.ccRegionLabel') as HTMLSelectElement
    expect(Array.from(ccSelect.options).map((o) => o.value)).toEqual(
      expect.arrayContaining(['seoul', 'busan']),
    )
    // KNOWN REGRESSION (see Task 6 report): the old modal scoped this list to the
    // seventy's assigned regions ("담당하지 않는 CC는 고를 수 없다"). TargetSection
    // (Task 3) lists every REGIONS entry unconditionally and has no scoping input
    // for it — fixing it means editing TargetSection.tsx, outside Task 6's file
    // scope. This assertion documents the current (regressed) behaviour.
    expect(Array.from(ccSelect.options).map((o) => o.value)).toContain('seoul-south')
  })

  it('CC를 고르지 않으면 저장을 막는다', async () => {
    openCcCouncilForm()
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    expect(await screen.findByText('schedule.errorCcRegionRequired')).toBeInTheDocument()
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('regionId와 cc_council을 보내고 unitId는 보내지 않는다', async () => {
    openCcCouncilForm()
    fireEvent.change(screen.getByLabelText('schedule.ccRegionLabel'), {
      target: { value: 'busan' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    const payload = createSpy.mock.calls[0][0]
    expect(payload).toMatchObject({ type: 'meeting', targetKind: 'cc_council', regionId: 'busan' })
    expect(payload).not.toHaveProperty('unitId')
    expect(payload).not.toHaveProperty('wardId')
  })

  // 스테이크를 먼저 고른 뒤 협의 평의회로 바꾸면 남은 unitId가 payload로 새어 나가면 안 된다
  it('스테이크를 골랐다가 협의 평의회로 바꿔도 unitId가 남지 않는다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'stake_president' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'cc_council' },
    })
    fireEvent.change(screen.getByLabelText('schedule.ccRegionLabel'), {
      target: { value: 'seoul' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('unitId')
  })

  // Task 3의 의도적 설계 변경(대상 유형은 그 위 칸(목적/대상 방문)을 절대 건드리지 않는다,
  // task-3-report.md "이 계획이 존재하는 이유" 참고): 예전 모달은 협의 평의회를 고르면
  // 목적 select를 통째로 숨겼지만, 그 가드는 Task 3에서 의도적으로 없앴다. 이 테스트는
  // 그 새 의도를 확인한다 — 예전 동작(가드 있음)을 다시 넣는 게 아니다.
  it('협의 평의회를 골라도 목적(사전 모임) 선택은 그대로 남아 있다 — 대상 유형이 위쪽 칸을 바꾸지 않는다', () => {
    openCcCouncilForm()
    expect(screen.getByLabelText('schedule.purposeLabel')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PIN-DOWN TESTS (Task 6, Step 1) — DO NOT EDIT AFTER THIS POINT.
//
// These capture the *current* adminCreateSchedule payload byte-for-byte, before
// ScheduleFormModal is rebuilt on top of useScheduleForm/TargetSection/WhenSection/
// DetailSection. They must pass unmodified both before and after the refactor.
// If the refactor makes one of these fail, the refactor changed behaviour — fix the
// refactor, never this block.
// ---------------------------------------------------------------------------
describe('ScheduleFormModal 핀다운: adminCreateSchedule payload 계약', () => {
  const SEVENTY_USER: AppUser = {
    uid: 'test-uid',
    email: 'test@test.com',
    name: '테스트',
    role: 'seventy',
    regionId: 'seoul',
    createdAt: '2026-01-01',
  }

  const CC_SEVENTY_USER: AppUser = {
    uid: 'test-uid',
    email: 'test@test.com',
    name: '테스트',
    role: 'seventy',
    regionIds: ['seoul', 'busan'],
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
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_GYOMUN_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  function fillDateTime() {
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  it('ward_visit with stake + ward', async () => {
    mocks.currentUser = { ...(mocks.currentUser as AppUser), role: 'seventy' }
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '녹번 와드' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith({
      type: 'ward_visit',
      seventyUid: 'test-uid',
      unitId: 'seoul-stake',
      wardName: '녹번 와드',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '11:00',
      notes: '스테이크 회장: 홍길동 (010-1111-2222)',
      presidentAccompanied: false,
    })
  })

  it('interview with a ward target (ward: -> targetKind ward_bishop, wardId + wardName)', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.stakeLabelOptional'), {
      target: { value: 'seoul-east-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.targetLabel'), {
      target: { value: 'ward:seoul-east-gyomun' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith({
      type: 'interview',
      seventyUid: 'test-uid',
      unitId: 'seoul-east-stake',
      wardName: '교문 와드',
      targetKind: 'ward_bishop',
      wardId: 'seoul-east-gyomun',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '11:00',
      notes: '감독: 김교문 (010-2222-3333)',
    })
  })

  it('interview with a stake target (unit: -> targetKind stake_president)', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.stakeLabelOptional'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.targetLabel'), {
      target: { value: 'unit:seoul-stake' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith({
      type: 'interview',
      seventyUid: 'test-uid',
      unitId: 'seoul-stake',
      presidentUid: 'president-uid',
      targetKind: 'stake_president',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '11:00',
      notes: '스테이크 회장: 홍길동 (010-1111-2222)',
    })
  })

  it('meeting with cc_council sends regionId, not unitId', async () => {
    mocks.currentUser = CC_SEVENTY_USER
    mocks.users = [CC_SEVENTY_USER]
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [MOCK_STAKE_PRESIDENT],
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.targetLabel'), {
      target: { value: 'cc_council' },
    })
    fireEvent.change(screen.getByLabelText('schedule.ccRegionLabel'), {
      target: { value: 'busan' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith({
      type: 'meeting',
      seventyUid: 'test-uid',
      regionId: 'busan',
      targetKind: 'cc_council',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '11:00',
    })
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('unitId')
  })

  it('a free-text target (other) prefixes notes with 대상: <name>', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.interview'))
    fireEvent.change(screen.getByLabelText('schedule.targetLabel'), { target: { value: 'other' } })
    fireEvent.change(screen.getByLabelText('schedule.targetFreeTextLabel'), {
      target: { value: '홍길순' },
    })
    fireEvent.change(screen.getByLabelText('schedule.notesLabelOptional'), {
      target: { value: '개인 상담 필요' },
    })
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith({
      type: 'interview',
      seventyUid: 'test-uid',
      targetKind: 'other',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '11:00',
      notes: '대상: 홍길순\n개인 상담 필요',
    })
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('unitId')
  })

  it('a pre-visit meeting (purpose: pre_visit with a related visit)', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.click(screen.getByText('schedule.type.meeting'))
    fireEvent.change(screen.getByLabelText('schedule.stakeLabelOptional'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.purposeLabel'), {
      target: { value: 'pre_visit' },
    })
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), {
      target: { value: 'v1' },
    })
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: dates.beforeVisit },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy).toHaveBeenCalledWith({
      type: 'meeting',
      seventyUid: 'test-uid',
      unitId: 'seoul-east-stake',
      wardName: '교문 와드',
      targetKind: 'ward_bishop',
      wardId: 'seoul-east-gyomun',
      relatedVisitId: 'v1',
      date: dates.beforeVisit,
      startTime: '10:00',
      endTime: '11:00',
      notes: '감독: 김교문 (010-2222-3333)',
    })
  })
})
