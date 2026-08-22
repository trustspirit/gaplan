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
// Zoom link picker는 useZoomLinks()(Firestore)에 의존한다 — 그 자체 동작은
// ZoomLinkPicker.test.tsx가 고정하므로, 이 모달 테스트에서는 자리만 확인한다.
vi.mock('@/components/domain/scheduleForm/ZoomLinkPicker', () => ({
  ZoomLinkPicker: () => <div data-testid="zoom-link-picker" />,
}))
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from 'sonner'
import { ScheduleFormModal } from './ScheduleFormModal'
import { buildNotesWithLeaderContact } from './leaderContactNotes'
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
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)
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
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(getLeaderByUnitName).toBeDefined()
  })
})

describe('ScheduleFormModal 연락처 대상', () => {
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

  // Controller ruling R2 (2026-08-22): restored — the modal computes the scoped
  // unit list/disabled state (unitPool/unitSelectDisabled, moved back from the
  // pre-refactor ScheduleFormModal) and passes it into TargetSection as
  // read-only data. While the assigned seventy's record hasn't loaded yet, the
  // stake/district select must stay disabled so it never briefly offers
  // out-of-scope units.
  it('담당 칠십인 지역 정보가 로딩되기 전에는 전체 단위를 열지 않는다', () => {
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)
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
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_GYOMUN_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  // 날짜를 pin-down 원본(commit d033e2e)과 맞춘다 — 아래 exact-payload 테스트들이 그
  // 원본이 캡처한 payload와 한 글자도 다르지 않게 비교할 수 있도록.
  function fillDateTime() {
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  // Task 2 (스케줄 폼 레이아웃 개선, 2026-08-22): 접기를 완전히 없앤다 — 열자마자
  // Zoom 링크와 장소 입력칸이 클릭 없이 보인다.
  it('접견 폼을 열자마자 Zoom 링크와 장소 입력칸이 클릭 없이 보인다', () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText('schedule.zoomLinkOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.locationOptional')).toBeInTheDocument()
  })

  it('와드 대상 선택 시 targetKind=ward_bishop, wardId를 payload에 포함한다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

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
  //
  // Controller ruling R1 (2026-08-22): this is the payload-level replacement for the
  // retired pin-down case "interview with a ward target" (commit d033e2e) — same
  // exact payload object, driven through the new (post-Task-3) DOM instead of the
  // old compound "대상" select, which no longer exists.
  it('와드 감독 접견 대상을 고르면 payload에 wardName이 실리고, 그 payload로 접견 제목이 와드를 밝힌다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

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
    // Exact match — same payload the retired pin-down test captured from the
    // original code (commit d033e2e, "interview with a ward target").
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
    const payload = createSpy.mock.calls[0][0]
    expect(buildScheduleTitle({ ...payload, unitName: '서울동 스테이크' })).toBe('교문 와드 감독 접견')
  })

  // Controller ruling R1: payload-level replacement for the retired pin-down case
  // "interview with a stake target" (commit d033e2e) — same exact payload, driven
  // through the new DOM. Also verifies the unitNameKo mapping this task added (see
  // task-6-report.md) — that stake_president notes come from ALL_UNITS, not a
  // stale selectedContactTarget label.
  it('스테이크 대상 선택 시 targetKind=stake_president, presidentUid를 payload에 포함하고 회장 연락처를 노트에 남긴다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'stake_president' },
    })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
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

  // Controller ruling R1: payload-level replacement for the retired pin-down case
  // "a free-text target (other)" (commit d033e2e) — same exact payload (including
  // the two-line "대상: <name>\n<notes>" concatenation), driven through the new DOM.
  it('스테이크/지방부를 선택하지 않아도(옵션널) 대상을 기타로 직접 입력하면 저장할 수 있다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

    // No stake/unit selected — 대상 유형만 '기타'로 고른다
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), { target: { value: 'other' } })
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

  // Controller ruling R5 (2026-08-22): 대상을 '기타'로 골라도 스테이크는 계속 물어야
  // 한다 — 예전 폼(ab3ad67:ScheduleFormModal.tsx:306)은 대상이 '기타'여도 그때까지
  // 고른 스테이크를 그대로 payload에 실었다("서울 스테이크" 선택 → 대상=기타 →
  // {targetKind:'other', unitId:'seoul-stake'}, 제목 "서울 스테이크 접견", 장소
  // "서울 스테이크"). 스테이크를 안 물으면 이 소속 정보와 제목·장소가 사라진다.
  it('스테이크를 고르고 대상을 기타로 골라도 그 스테이크가 payload와 제목·장소에 남는다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), { target: { value: 'other' } })
    fireEvent.change(screen.getByLabelText('schedule.stakeLabelOptional'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.targetFreeTextLabel'), {
      target: { value: '홍길순' },
    })
    expect(screen.getByLabelText('schedule.customTitleOptional')).toHaveAttribute(
      'placeholder',
      '서울 스테이크 접견',
    )
    expect(screen.getByLabelText('schedule.locationOptional')).toHaveAttribute(
      'placeholder',
      '서울 스테이크',
    )

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0][0]).toMatchObject({
      targetKind: 'other',
      unitId: 'seoul-stake',
    })
  })

  // Controller ruling R9 (2026-08-22): 대상을 고르면 그 리더의 연락처가 노트에 붙는다는
  // 게 이 select의 요점이므로, 저장 전에 누가 그 대상인지(리더의 역할) 보여야 한다.
  it('스테이크/와드 대상 옵션에 리더 역할이 라벨로 붙는다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'stake_president')
    const stakeSelect = screen.getByLabelText('schedule.stakeLabel') as HTMLSelectElement
    expect(
      Array.from(stakeSelect.options).find((o) => o.value === 'seoul-stake')?.label,
    ).toBe('서울 스테이크 · 스테이크 회장')

    await userEvent.selectOptions(screen.getByLabelText('schedule.targetKindLabel'), 'ward_bishop')
    await userEvent.selectOptions(screen.getByLabelText('schedule.stakeLabel'), 'seoul-stake')
    const wardSelect = screen.getByLabelText('schedule.wardLabel') as HTMLSelectElement
    expect(
      Array.from(wardSelect.options).find((o) => o.value === '녹번 와드')?.label,
    ).toBe('녹번 와드 · 감독')
  })

  it('접견에서 대상을 아무것도 선택하지 않으면 저장되지 않는다', async () => {
    render(<ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />)

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(createSpy).not.toHaveBeenCalled()
  })

  // 비워 두면 뭐가 될지 알 수 있어야 비워 둘 수 있다.
  it('제목 칸 placeholder에 자동 생성될 제목을 보여준다', async () => {
    render(<ScheduleFormModal onClose={vi.fn()} onSaved={vi.fn()} fixedType="interview" />)
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
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_GYOMUN_BISHOP],
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
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('schedule.purposePreVisitCheckbox'))
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

  // Controller ruling R1 (2026-08-22): payload-level replacement for the retired
  // pin-down case "a pre-visit meeting" (commit d033e2e) — same exact payload,
  // driven through the new DOM (purpose + related-visit selection, same as before).
  it('대상 방문을 고르면 relatedVisitId를 payload에 포함한다', async () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('schedule.purposePreVisitCheckbox'))
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), {
      target: { value: 'v1' },
    })

    fillDateTime()
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

  it('일반 목적이면 relatedVisitId 없이 저장된다', async () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
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

  // Finding 1의 회귀 테스트("Select가 항상 렌더하는 placeholder 옵션에 더해 목적 Select의
  // options에도 'general' 항목을 넣어서 '일반'이 두 번 나타나던 버그")는 Task 3(스케줄
  // 폼 레이아웃 개선, 2026-08-22)에서 목적 select을 체크박스로 바꾸며 지워졌다 —
  // 체크박스는 옵션 목록이라는 개념 자체가 없어 이 버그가 재발할 통로가 없다. 대신 그
  // 자리에 있던 "기본값이 맞는가"라는 취지는 체크박스가 기본적으로 unchecked(=일반)로
  // 시작하는지로 이식한다.
  it('목적 체크박스는 기본적으로 체크되어 있지 않다(일반)', () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText('schedule.purposePreVisitCheckbox')).not.toBeChecked()
  })

  // Finding 1의 회귀 테스트("종류를 바꿔도 relatedVisitId가 남아 payload를 오염시키던 버그")는
  // Task 6(add-schedule-chooser)에서 지워졌다 — chooser가 종류를 고정해서 넘기므로
  // 폼 하나의 생애주기 안에서 종류가 바뀌는 경로 자체가 없어졌다(handleTypeChange 삭제).
  // 그 버그가 다시 날 수 있는 통로가 없으므로 이 케이스는 이식 대상이 아니다.

  // Finding 2: 고른 방문이 목록에서 사라져도(예: 모임 날짜를 방문 이후로 변경) stale id가
  // 그대로 서버로 전송되던 버그의 회귀 테스트. mock된 useUpcomingVisits는 fromDate가
  // 방문일(dates.visit)보다 늦으면 빈 목록을 돌려준다.
  it('선택한 방문이 목록에서 사라지면(모임 날짜를 방문 이후로 변경) 저장 시 대상 방문을 다시 요구한다', async () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('schedule.purposePreVisitCheckbox'))
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
    const { unmount } = render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
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
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('schedule.purposePreVisitCheckbox'))
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

  // 날짜를 pin-down 원본(commit d033e2e, "meeting with cc_council")과 맞춘다.
  function fillDateTime() {
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
  }

  function openCcCouncilForm() {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'cc_council' },
    })
  }

  it('모임에서만 협의 평의회 대상을 제공한다', () => {
    // 종류가 폼 하나의 생애주기 동안 고정되므로(chooser가 고정해서 연다), 두 종류를
    // 한 렌더 안에서 클릭으로 오가며 비교하던 예전 방식 대신 각 종류를 따로 마운트한다.
    const { unmount: unmountInterview } = render(
      <ScheduleFormModal fixedType="interview" onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    const interviewTarget = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(interviewTarget.options).map((o) => o.value)).not.toContain('cc_council')
    unmountInterview()

    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    const meetingTarget = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(meetingTarget.options).map((o) => o.value)).toContain('cc_council')
  })

  // 협의 평의회는 CC 전체가 대상이므로 스테이크를 먼저 고르지 않아도 선택할 수 있어야 한다
  it('스테이크를 고르지 않아도 협의 평의회를 선택할 수 있다', () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
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
    // 담당하지 않는 CC는 고를 수 없다 (Controller ruling R2 — restored)
    expect(Array.from(ccSelect.options).map((o) => o.value)).not.toContain('seoul-south')
  })

  it('CC를 고르지 않으면 저장을 막는다', async () => {
    openCcCouncilForm()
    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    expect(await screen.findByText('schedule.errorCcRegionRequired')).toBeInTheDocument()
    expect(createSpy).not.toHaveBeenCalled()
  })

  // Controller ruling R6 (2026-08-22): 담당 CC가 하나뿐인 칠십인(아마 흔한 경우)이 협의
  // 평의회를 고르면 예전 모달처럼 그 CC를 자동으로 채운다 — "담당 CC가 하나뿐이면 굳이
  // 고르게 하지 않는다"(ab3ad67:ScheduleFormModal.tsx:525). 자동 선택 없이는 CC를
  // 일부러 다시 고르지 않는 한 errorCcRegionRequired에 걸린다.
  it('담당 CC가 하나뿐이면 협의 평의회를 고를 때 자동으로 채워져 저장된다', async () => {
    const SINGLE_CC_SEVENTY: AppUser = {
      uid: 'test-uid',
      email: 'test@test.com',
      name: '테스트',
      role: 'seventy',
      regionId: 'seoul',
      createdAt: '2026-01-01',
    }
    mocks.currentUser = SINGLE_CC_SEVENTY
    mocks.users = [SINGLE_CC_SEVENTY]

    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'cc_council' },
    })
    expect((screen.getByLabelText('schedule.ccRegionLabel') as HTMLSelectElement).value).toBe('seoul')

    fillDateTime()
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(createSpy.mock.calls[0][0]).toMatchObject({ targetKind: 'cc_council', regionId: 'seoul' })
  })

  // Controller ruling R1 (2026-08-22): payload-level replacement for the retired
  // pin-down case "meeting with cc_council sends regionId, not unitId" (commit
  // d033e2e) — same exact payload, driven through the new DOM.
  it('regionId와 cc_council을 보내고 unitId는 보내지 않는다', async () => {
    openCcCouncilForm()
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
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('wardId')
  })

  // 스테이크를 먼저 고른 뒤 협의 평의회로 바꾸면 남은 unitId가 payload로 새어 나가면 안 된다.
  // (모임은 스테이크 회장 대상을 제공하지 않으므로(R4) 여기서는 ward_bishop으로 unitId를 채운다.)
  it('스테이크를 골랐다가 협의 평의회로 바꿔도 unitId가 남지 않는다', async () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('schedule.targetKindLabel'), {
      target: { value: 'ward_bishop' },
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

  it('협의 평의회에는 사전 준비 모임 목적을 노출하지 않는다', () => {
    openCcCouncilForm()
    expect(screen.queryByLabelText('schedule.purposePreVisitCheckbox')).not.toBeInTheDocument()
  })

  // Controller ruling R4 (2026-08-22): 스테이크/지방부 회장 대상은 접견에만 있다 —
  // CF가 한 번도 받아본 적 없는 `type: 'meeting'` + `targetKind: 'stake_president'`
  // 조합을 이 리팩터가 새로 열면 안 된다.
  it('모임 대상 유형에는 스테이크/지방부 회장이 없다', () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    const kindSelect = screen.getByLabelText('schedule.targetKindLabel') as HTMLSelectElement
    expect(Array.from(kindSelect.options).map((o) => o.value)).not.toContain('stake_president')
  })
})

// ---------------------------------------------------------------------------
// PIN-DOWN TEST (Task 6, Step 1) — DO NOT EDIT.
//
// Originally 6 cases, captured byte-for-byte from the pre-refactor code and
// committed alone in d033e2e. Controller ruling R1 (2026-08-22): 5 of the 6
// drove the old modal's single compound "대상" select (`schedule.targetLabel`,
// values like `ward:<id>`/`unit:<id>`), which Task 3's TargetSection — already
// committed before this task started — retired by design (a target-kind select
// plus separate concrete pickers replaced it). Those 5 could never survive the
// refactor unedited; querying a DOM that no longer exists isn't a test that can
// stay frozen. Per the controller: delete them here, but their payload
// expectations are not lost — they now live as exact-match assertions in the
// rewritten tests below (each commented "Controller ruling R1... payload-level
// replacement for the retired pin-down case ..."), verified against the exact
// objects this block captured in d033e2e. Only this one case survives unedited,
// because ward_visit's stake/ward fields happen to use the same labels/values
// before and after Task 3.
// ---------------------------------------------------------------------------
// end-time-autofill-brief.md §4 회귀 테스트 1, 2: 순수 함수(scheduleTimeRules.test.ts)만으로는
// WhenSection의 배선이 검증되지 않는다 — 실제로 시작 Input에 값을 넣으면 종료 Input이 채워지는지
// 모달 레벨에서 핀으로 박는다.
describe('ScheduleFormModal 시작 시간 자동 종료 채움', () => {
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
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  it('모임에서 시작을 19:00으로 입력하면 종료가 20:00으로 채워진다(기본 1시간)', () => {
    render(<ScheduleFormModal fixedType="meeting" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '19:00' } })
    expect(screen.getByLabelText('common.endTime')).toHaveValue('20:00')
  })

  it('와드 방문에서 시작을 09:00으로 입력하면 종료가 11:00으로 채워진다(기본 2시간)', () => {
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '09:00' } })
    expect(screen.getByLabelText('common.endTime')).toHaveValue('11:00')
  })
})

describe('ScheduleFormModal 핀다운: adminCreateSchedule payload 계약', () => {
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
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)

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
})

// add-schedule-chooser Task 4: 종류가 fixedType 하나로 고정되니 세그먼트 컨트롤
// 자체가 없어져야 하고, onBack이 주어지면 그 dirty 확인이 requestClose와 같아야 한다.
// event-toast-and-multiday brief §1: 폼 모달이 자기 성공 토스트를 소유한다 — 호출부가
// 또 한 번 띄우면 중복이 난다(사용자 신고: 행사 하나 추가에 토스트가 두 개 뜸). 일정
// 저장도 같은 규칙을 따라야 한다.
describe('ScheduleFormModal 토스트 소유권', () => {
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
      leaders: [MOCK_STAKE_PRESIDENT, MOCK_LEADER_BISHOP, MOCK_GYOMUN_BISHOP],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  it('저장에 성공하면 toast.success가 정확히 한 번 불린다', async () => {
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('schedule.stakeLabel'), {
      target: { value: 'seoul-stake' },
    })
    fireEvent.change(screen.getByLabelText('schedule.wardLabel'), {
      target: { value: '녹번 와드' },
    })
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('common.endTime'), { target: { value: '11:00' } })
    fireEvent.click(screen.getByText('schedule.saveBtn'))

    await waitFor(() => expect(createSpy).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('schedule.savedSuccess')
  })
})

describe('ScheduleFormModal 뒤로 가기 · 세그먼트 제거', () => {
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
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [],
      loading: false,
      getLeaderByUnitName: vi.fn().mockReturnValue(undefined),
    })
  })

  it('종류를 고르는 세그먼트 컨트롤이 없다', () => {
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /^schedule\.type\./ })).toBeNull()
  })

  it('onBack이 없으면 뒤로 버튼을 렌더하지 않는다', () => {
    render(<ScheduleFormModal fixedType="ward_visit" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'common.back' })).toBeNull()
  })

  it('입력이 없으면 뒤로를 눌러 바로 onBack이 불린다', () => {
    const onBack = vi.fn()
    render(
      <ScheduleFormModal fixedType="ward_visit" onBack={onBack} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(onBack).toHaveBeenCalled()
  })

  // 뒤로 가기는 닫기와 같은 dirty 확인을 태워야 한다 — 입력을 조용히 버리지 않는다.
  it('입력이 있는 상태에서 뒤로를 누르면 확인을 묻고, 취소하면 onBack을 부르지 않는다', () => {
    const onBack = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <ScheduleFormModal fixedType="ward_visit" onBack={onBack} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(confirmSpy).toHaveBeenCalledWith('common.discardChanges')
    expect(onBack).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('확인 대화상자에서 승인하면 onBack이 불린다', () => {
    const onBack = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <ScheduleFormModal fixedType="ward_visit" onBack={onBack} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), {
      target: { value: '2026-09-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(onBack).toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
