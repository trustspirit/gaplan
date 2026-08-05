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
