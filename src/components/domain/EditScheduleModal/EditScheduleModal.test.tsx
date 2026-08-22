import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import type { Schedule } from '@/types'

const { editSpy } = vi.hoisted(() => ({ editSpy: vi.fn() }))

// Heavy mocks to isolate the component, mirroring ScheduleFormModal.test.tsx's setup.
vi.mock('@/firebase', () => ({ db: {}, functions: {}, auth: {} }))
vi.mock('firebase/functions', () => ({ httpsCallable: () => editSpy }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: [] }),
}))

// mock의 fromDate 반응: 방문일(2026-08-09)보다 늦은 fromDate로 조회하면 목록에서
// v1이 사라진다 — ScheduleFormModal 테스트의 Finding 2 재현 패턴과 동일.
vi.mock('@/hooks/useUpcomingVisits', () => ({
  useUpcomingVisits: (_seventyUid: string, fromDate: string) => ({
    visits: fromDate && fromDate <= '2026-08-09'
      ? [{ id: 'v1', date: '2026-08-09', wardName: '교문 와드', unitId: 'seoul-east-stake' }]
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

import { EditScheduleModal } from './EditScheduleModal'

const MEETING_SCHEDULE: Schedule = {
  id: 'sched-1',
  type: 'meeting',
  seventyUid: 'seventy-1',
  unitId: 'seoul-east-stake',
  presidentUid: null,
  date: '2026-08-01',
  startTime: '10:00',
  endTime: '11:00',
  status: 'confirmed',
  createdBy: 'admin-uid',
  relatedVisitId: 'v1',
}

describe('EditScheduleModal 사전 모임 연결', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    editSpy.mockReset()
    editSpy.mockResolvedValue({ data: {} })
  })

  it('연결 해제(빈 값 선택) 시 relatedVisitId: null 이 전송된다', async () => {
    render(
      <EditScheduleModal
        schedule={MEETING_SCHEDULE}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), { target: { value: '' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: null }),
    }))
  })

  // Finding 7: 목록이 비면(연결된 방문이 취소되거나 조회 창 밖으로 나가면) Select가
  // disabled가 되어 화면에서 연결을 해제할 방법이 없어지던 버그의 회귀 테스트.
  it('목록이 비어 있어도 relatedVisitId가 있으면 Select가 비활성화되지 않고, 빈 값을 고르면 relatedVisitId: null이 전송된다', async () => {
    // 방문일(2026-08-09)보다 늦은 날짜라 useUpcomingVisits는 빈 목록을 돌려준다(목 조건).
    const scheduleAfterVisit: Schedule = { ...MEETING_SCHEDULE, date: '2026-08-10' }
    render(
      <EditScheduleModal
        schedule={scheduleAfterVisit}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    const relatedVisitSelect = screen.getByLabelText('schedule.relatedVisitLabel')
    expect(relatedVisitSelect).not.toBeDisabled()

    fireEvent.change(relatedVisitSelect, { target: { value: '' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: null }),
    }))
  })

  it('날짜를 건드리지 않으면 초기 연결값이 목록에 없어도 그대로 보존된다', async () => {
    // 방문일(2026-08-09)보다 늦은 날짜로 저장된 일정이라 useUpcomingVisits는
    // fromDate=schedule.date 기준으로 빈 목록을 돌려준다(목 조건: fromDate > 2026-08-09).
    // 사용자가 날짜를 바꾸지 않았으므로 초기값 relatedVisitId는 지워지면 안 된다.
    const scheduleAfterVisit: Schedule = { ...MEETING_SCHEDULE, date: '2026-08-10' }
    render(
      <EditScheduleModal
        schedule={scheduleAfterVisit}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: 'v1' }),
    }))
  })

  it('사용자가 날짜를 방문 이후로 바꾸면(목록에서 사라지면) stale id를 지운다', async () => {
    render(
      <EditScheduleModal
        schedule={MEETING_SCHEDULE}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    // 방문일(2026-08-09) 이후로 모임 날짜를 옮기면 목록에서 v1이 사라진다
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: '2026-08-10' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: null }),
    }))
  })

  // 리뷰 Finding: 날짜를 바꿔 자동으로 지워진 relatedVisitId가, 날짜를 원래대로
  // 되돌려도 복구되지 않고 그대로 null로 저장되던 버그의 회귀 테스트.
  it('날짜를 바꿔 연결이 지워진 뒤 원래대로 되돌리면 relatedVisitId가 복구된다', async () => {
    render(
      <EditScheduleModal
        schedule={MEETING_SCHEDULE}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    // 방문일(2026-08-09) 이후로 옮기면 목록에서 v1이 사라져 자동으로 지워진다
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: '2026-08-10' } })
    // 원래 날짜로 되돌린다 (오타 수정이었거나 그냥 만져본 경우)
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: MEETING_SCHEDULE.date } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: 'v1' }),
    }))
  })

  // 리뷰 Finding: 위 복구 로직이 사용자가 Select에서 직접 고른 선택(연결 해제 포함)까지
  // 덮어써서는 안 된다 — 직접 건드린 뒤에는 날짜를 만졌다 되돌려도 그 선택이 유지돼야 한다.
  it('사용자가 직접 연결을 해제한 뒤 날짜를 바꿨다 되돌려도 해제 상태가 유지된다', async () => {
    render(
      <EditScheduleModal
        schedule={MEETING_SCHEDULE}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: '2026-08-10' } })
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: MEETING_SCHEDULE.date } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: null }),
    }))
  })

  // 재리뷰 Finding: touched 가드가 stale 정리 분기까지 같이 막아서, Select를 한 번
  // 건드린 뒤 같은 세션에서 날짜를 방문 이후로 바꾸면 더 이상 유효하지 않은 id가
  // 지워지지 않고 그대로 저장 payload에 남던 버그의 회귀 테스트.
  it('Select를 직접 건드린 뒤 같은 세션에서 날짜를 방문 이후로 바꾸면 stale id가 지워진다', async () => {
    render(
      <EditScheduleModal
        schedule={MEETING_SCHEDULE}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    // Select를 직접 조작해 touched 플래그를 세운다 (같은 값을 다시 골라도 사용자의
    // 명시적 선택으로 취급된다)
    fireEvent.change(screen.getByLabelText('schedule.relatedVisitLabel'), { target: { value: 'v1' } })
    // 방문일(2026-08-09) 이후로 옮기면 v1이 목록에서 사라진다 — 원래 날짜로 되돌리지
    // 않고 그대로 저장한다
    fireEvent.change(screen.getByLabelText('schedule.dateLabel'), { target: { value: '2026-08-10' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ relatedVisitId: null }),
    }))
  })

  it('접견/모임이 아닌 일정(구역 방문)에는 relatedVisitId를 payload에 넣지 않는다', async () => {
    const visitSchedule: Schedule = {
      ...MEETING_SCHEDULE,
      type: 'ward_visit',
      wardName: '녹번 와드',
      relatedVisitId: undefined,
    }
    render(
      <EditScheduleModal
        schedule={visitSchedule}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('schedule.relatedVisitLabel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy.mock.calls[0][0].updates).not.toHaveProperty('relatedVisitId')
  })
})

describe('EditScheduleModal 장소 프리필', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    editSpy.mockReset()
    editSpy.mockResolvedValue({ data: {} })
  })

  // 편집 CF는 payload에 location이 없으면 저장된 장소를 다시 유도해 버린다(비고정) — 폼이
  // schedule.location으로 프리필하지 않으면 시간만 바꾸는 편집이 사용자가 손으로 쓴 장소를
  // 조용히 규칙 유도값으로 덮어써 버린다. 규칙으로 유도되는 값과 저장된 값이 다른 일정으로
  // 프리필이 저장값(규칙 유도값이 아니라)을 쓰는지 못박는다.
  it('규칙으로 유도되는 장소와 저장된 장소가 다르면 입력칸은 저장된 값을 보여준다', () => {
    // 규칙대로라면 접견의 장소는 unitName('서울동 스테이크')이지만, 저장된 문서에는
    // 사용자가 직접 쓴 다른 장소('2층 회의실')가 들어 있다.
    const scheduleWithCustomLocation: Schedule = {
      ...MEETING_SCHEDULE,
      type: 'interview',
      unitId: 'seoul-east-stake',
      location: '2층 회의실',
    }
    render(
      <EditScheduleModal
        schedule={scheduleWithCustomLocation}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('schedule.locationOptional')).toHaveValue('2층 회의실')
  })

  // Task 2 (스케줄 폼 레이아웃 개선, 2026-08-22): 접기를 완전히 없앤다 — 생성 모달과
  // 마찬가지로 편집 모달도 열자마자 Zoom 링크와 장소 입력칸이 클릭 없이 보인다.
  it('편집 모달을 열자마자 Zoom 링크와 장소 입력칸이 클릭 없이 보인다', () => {
    const schedule: Schedule = { ...MEETING_SCHEDULE, type: 'interview', unitId: 'seoul-east-stake' }
    render(<EditScheduleModal schedule={schedule} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByLabelText('schedule.zoomLinkOptional')).toBeInTheDocument()
    expect(screen.getByLabelText('schedule.locationOptional')).toBeInTheDocument()
  })

  it('프리필된 장소를 건드리지 않고 저장하면 저장된 장소가 그대로 payload에 담긴다', async () => {
    const scheduleWithCustomLocation: Schedule = {
      ...MEETING_SCHEDULE,
      type: 'interview',
      unitId: 'seoul-east-stake',
      location: '2층 회의실',
    }
    render(
      <EditScheduleModal
        schedule={scheduleWithCustomLocation}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: 'sched-1',
      updates: expect.objectContaining({ location: '2층 회의실' }),
    }))
  })
})

// Task 7, Step 1: 리팩터 전에 현재 코드가 실제로 보내는 updates 객체를 통째로 못박는다
// (Controller ruling 2). 아래는 모두 objectContaining이 아니라 완전한 객체로 비교한다 —
// 리팩터 후 새 DOM으로 옮길 때 이 객체를 그대로 재사용해 필드가 하나라도 달라지면 즉시
// 드러나게 하기 위해서다.
describe('EditScheduleModal payload 고정(pin-down) — Task 7', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    editSpy.mockReset()
    editSpy.mockResolvedValue({ data: {} })
  })

  it('구역 방문 — 아무것도 건드리지 않고 저장', async () => {
    const schedule: Schedule = {
      id: 'sched-visit-1',
      type: 'ward_visit',
      seventyUid: 'seventy-1',
      unitId: 'seoul-east-stake',
      wardName: '녹번 와드',
      presidentUid: null,
      date: '2026-08-01',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
      createdBy: 'admin-uid',
    }
    render(<EditScheduleModal schedule={schedule} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith({
      scheduleId: 'sched-visit-1',
      updates: {
        date: '2026-08-01',
        startTime: '10:00',
        endTime: '11:00',
        notes: null,
        unitId: 'seoul-east-stake',
        wardName: '녹번 와드',
        projectId: null,
        presidentAccompanied: null,
      },
    })
  })

  it('접견(와드 감독 대상) — 아무것도 건드리지 않고 저장', async () => {
    const schedule: Schedule = {
      id: 'sched-int-ward-1',
      type: 'interview',
      seventyUid: 'seventy-1',
      unitId: 'seoul-east-stake',
      wardName: '녹번 와드',
      targetKind: 'ward_bishop',
      presidentUid: 'bishop-uid-1',
      date: '2026-08-03',
      startTime: '09:00',
      endTime: '09:30',
      status: 'confirmed',
      createdBy: 'admin-uid',
      notes: '개인 면담',
      zoomLink: 'https://zoom.us/j/111',
      customTitle: '감독 접견',
      location: '스테이크 센터',
      projectId: 'proj-1',
      relatedVisitId: null,
    }
    render(<EditScheduleModal schedule={schedule} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith({
      scheduleId: 'sched-int-ward-1',
      updates: {
        date: '2026-08-03',
        startTime: '09:00',
        endTime: '09:30',
        notes: '개인 면담',
        unitId: 'seoul-east-stake',
        presidentUid: 'bishop-uid-1',
        zoomLink: 'https://zoom.us/j/111',
        customTitle: '감독 접견',
        location: '스테이크 센터',
        projectId: 'proj-1',
        relatedVisitId: null,
      },
    })
  })

  it('접견(스테이크 회장 대상) — 선택 칸이 비어 있는 채로 저장', async () => {
    const schedule: Schedule = {
      id: 'sched-int-stake-1',
      type: 'interview',
      seventyUid: 'seventy-1',
      unitId: 'seoul-stake',
      targetKind: 'stake_president',
      presidentUid: 'president-uid-1',
      date: '2026-08-05',
      startTime: '14:00',
      endTime: '14:30',
      status: 'confirmed',
      createdBy: 'admin-uid',
    }
    render(<EditScheduleModal schedule={schedule} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith({
      scheduleId: 'sched-int-stake-1',
      updates: {
        date: '2026-08-05',
        startTime: '14:00',
        endTime: '14:30',
        notes: null,
        unitId: 'seoul-stake',
        presidentUid: 'president-uid-1',
        zoomLink: null,
        customTitle: null,
        projectId: null,
        relatedVisitId: null,
      },
    })
  })

  it('협의 평의회 모임 — unitId를 아예 보내지 않는다', async () => {
    const schedule: Schedule = {
      id: 'sched-cc-1',
      type: 'meeting',
      seventyUid: 'seventy-1',
      unitId: '',
      regionId: 'seoul-region',
      targetKind: 'cc_council',
      presidentUid: null,
      date: '2026-08-07',
      startTime: '13:00',
      endTime: '15:00',
      status: 'confirmed',
      createdBy: 'admin-uid',
      notes: 'CC 모임',
      location: '지역 사무실',
      zoomLink: null,
      customTitle: '8월 CC 협의회',
      projectId: 'proj-2',
      relatedVisitId: undefined,
    }
    render(<EditScheduleModal schedule={schedule} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith({
      scheduleId: 'sched-cc-1',
      updates: {
        date: '2026-08-07',
        startTime: '13:00',
        endTime: '15:00',
        notes: 'CC 모임',
        zoomLink: null,
        customTitle: '8월 CC 협의회',
        location: '지역 사무실',
        projectId: 'proj-2',
        relatedVisitId: null,
      },
    })
  })

  it('사용자가 손으로 쓴 장소가 있는 일정 — 건드리지 않고 저장해도 그대로 담긴다', async () => {
    const schedule: Schedule = {
      id: 'sched-loc-1',
      type: 'meeting',
      seventyUid: 'seventy-1',
      unitId: 'seoul-east-stake',
      presidentUid: null,
      date: '2026-08-01',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
      createdBy: 'admin-uid',
      location: '2층 회의실',
      relatedVisitId: 'v1',
    }
    render(<EditScheduleModal schedule={schedule} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(editSpy).toHaveBeenCalled())
    expect(editSpy).toHaveBeenCalledWith({
      scheduleId: 'sched-loc-1',
      updates: {
        date: '2026-08-01',
        startTime: '10:00',
        endTime: '11:00',
        notes: null,
        unitId: 'seoul-east-stake',
        zoomLink: null,
        customTitle: null,
        location: '2층 회의실',
        projectId: null,
        relatedVisitId: 'v1',
      },
    })
  })
})

// end-time-autofill-brief.md §4 회귀 테스트 3: 편집 모달도 WhenSection을 공유하므로 같은
// 자동 채움을 따라와야 한다 — 단, 저장된 90분 간격은 시작을 옮겨도 보존돼야 한다.
describe('EditScheduleModal 시작 시간 자동 종료 채움', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    editSpy.mockReset()
    editSpy.mockResolvedValue({ data: {} })
  })

  it('09:00-10:30 일정을 열고 시작을 10:00으로 바꾸면 종료가 11:30으로 유지된다(90분 보존)', () => {
    render(
      <EditScheduleModal
        schedule={{ ...MEETING_SCHEDULE, startTime: '09:00', endTime: '10:30' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('common.startTime'), { target: { value: '10:00' } })
    expect(screen.getByLabelText('common.endTime')).toHaveValue('11:30')
  })
})

// I2 (2026-08-22): 편집 모달은 대상의 '종류'를 바꿀 수단이 없다 — TargetSection에는
// 단위(스테이크) select 하나만 남기고 유형/와드/CC/자유입력 select는 통째로 숨긴다
// (askOnlyUnit). 예전 이름 fixedKind는 실제로는 대상 유형을 고정하는 게 아니라 이
// 스위치였다 — 이름을 바로잡고, 그 스위치가 real target.kind(=schedule.targetKind)를
// 밀어내지 않는다는 것도 함께 고정한다: 실제 kind가 'other'인 일정을 열면 스테이크
// select 라벨이 (선택)으로 뜬다 — dummy 'stake_president'를 쓰던 예전에는 항상
// (필수)로만 떴다.
describe('EditScheduleModal 대상 select — askOnlyUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    editSpy.mockReset()
    editSpy.mockResolvedValue({ data: {} })
  })

  it('비-방문 일정을 열면 대상 관련 select가 스테이크 하나만 렌더링된다', () => {
    render(
      <EditScheduleModal
        schedule={{ ...MEETING_SCHEDULE, targetKind: 'ward_bishop', wardName: '녹번 와드' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    const targetFields = screen.queryAllByLabelText(
      /^schedule\.(targetKindLabel|stakeLabel|stakeLabelOptional|wardLabel|ccRegionLabel|targetFreeTextLabel)$/,
    )
    expect(targetFields).toHaveLength(1)
    expect(targetFields[0]).toHaveAccessibleName('schedule.stakeLabel')
  })

  // 실제 targetKind가 'other'면 스테이크는 선택 사항이다(M2 규칙) — askOnlyUnit이 real
  // target.kind를 밀어내지 않아야만 이 라벨이 정확히 나온다. dummy 'stake_president'를
  // 쓰던 예전 코드는 이 케이스에서도 늘 (필수) 라벨을 보여줬다.
  it('실제 targetKind가 other면 스테이크 라벨이 선택 사항으로 뜬다', () => {
    render(
      <EditScheduleModal
        schedule={{ ...MEETING_SCHEDULE, targetKind: 'other' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    const targetFields = screen.queryAllByLabelText(
      /^schedule\.(targetKindLabel|stakeLabel|stakeLabelOptional|wardLabel|ccRegionLabel|targetFreeTextLabel)$/,
    )
    expect(targetFields).toHaveLength(1)
    expect(targetFields[0]).toHaveAccessibleName('schedule.stakeLabelOptional')
  })
})
