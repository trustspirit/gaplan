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
