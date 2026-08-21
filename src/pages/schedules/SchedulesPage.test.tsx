import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Schedule } from '@/types'
import { SchedulesPage } from './SchedulesPage'

const ADMIN = {
  uid: 'a1',
  role: 'admin',
  name: '관리자',
  email: 'a@b.com',
  createdAt: '2026-01-01',
}

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: '2026-03-10',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'a1',
    ...over,
  }
}

const schedules = [
  schedule({ id: 'visit', type: 'ward_visit' }),
  schedule({ id: 'talk', type: 'interview', date: '2026-03-12' }),
]

vi.mock('jotai', () => ({
  useAtomValue: () => ADMIN,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
vi.mock('@/hooks/useSchedules', () => ({
  useSchedules: () => ({ schedules, loading: false, error: null }),
}))
vi.mock('@/hooks/useGeneralSchedules', () => ({
  useGeneralSchedules: () => ({ generalSchedules: [], allGeneralSchedules: [], loading: false }),
}))
vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => ({ getUnitName: (id: string) => id, getWardName: (n: string) => n }),
}))
vi.mock('@/hooks/useScheduleDateRange', () => ({
  useScheduleDateRange: () => ({
    setting: { preset: 'rolling' },
    range: { start: '2020-01-01', end: '2030-12-31' },
    loading: false,
    save: vi.fn(),
  }),
}))
vi.mock('@/hooks/useDeleteWithUndo', () => ({
  useDeleteWithUndo: () => ({ pendingIds: new Set(), scheduleDelete: vi.fn() }),
}))
vi.mock('@/hooks/useEffectiveScope', () => ({
  useEffectiveScope: () => ({ regionIds: null, actingSeventyUid: null }),
}))

// 서비스 모듈은 import만으로 src/firebase.ts를 평가한다 — getAuth/getFirestore가
// 즉시 돌아서 jsdom에서 터진다. 저장소의 다른 페이지 테스트(TaskProgress.test.tsx)와
// 같은 이유로 서비스와 sonner를 함께 막는다.
vi.mock('@/services/scheduleService', () => ({
  manualCalendarSync: vi.fn(async () => ({ message: 'ok' })),
  deleteScheduleViaCF: vi.fn(async () => {}),
}))
vi.mock('@/services/generalScheduleService', () => ({
  registerAttendance: vi.fn(async () => {}),
  cancelAttendance: vi.fn(async () => {}),
  updateGeneralSchedule: vi.fn(async () => {}),
  deleteGeneralSchedule: vi.fn(async () => {}),
}))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

// 달력 격자와 무거운 모달은 각자 테스트를 갖고 있다. 여기서는 배선만 본다.
vi.mock('@/components/domain/CalendarView/CalendarView', () => ({
  CalendarView: ({ view }: { view?: string }) => <div data-testid="calendar">{view}</div>,
}))
vi.mock('@/components/domain/ScheduleFormModal/ScheduleFormModal', () => ({
  ScheduleFormModal: () => <div data-testid="schedule-form" />,
}))
vi.mock('@/components/domain/EditScheduleModal/EditScheduleModal', () => ({
  EditScheduleModal: () => <div data-testid="edit-form" />,
}))
vi.mock('@/components/domain/GeneralScheduleFormModal/GeneralScheduleFormModal', () => ({
  GeneralScheduleFormModal: () => <div data-testid="event-form" />,
}))
vi.mock('@/components/domain/GeneralScheduleDetailSheet/GeneralScheduleDetailSheet', () => ({
  GeneralScheduleDetailSheet: () => null,
}))
vi.mock('@/components/domain/ScheduleItem/ScheduleItem', () => ({
  ScheduleItem: ({ schedule: s }: { schedule: Schedule }) => <div>row-{s.id}</div>,
}))
vi.mock('@/components/domain/GeneralEventItem/GeneralEventItem', () => ({
  GeneralEventItem: () => <div>event-row</div>,
}))
vi.mock('@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter', () => ({
  ScheduleDateRangeFilter: () => <div />,
}))

describe('SchedulesPage', () => {
  it('opens on the month calendar', () => {
    render(<SchedulesPage />)
    expect(screen.getByTestId('calendar')).toHaveTextContent('month')
  })

  it('switches the calendar to the week view', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'common.weekView' }))
    expect(screen.getByTestId('calendar')).toHaveTextContent('week')
  })

  it('replaces the calendar with a grouped list', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    expect(screen.queryByTestId('calendar')).toBeNull()
    expect(screen.getByText('row-visit')).toBeInTheDocument()
  })

  // 통합의 요점 — 방문과 접견이 한 목록에 함께 있다(스펙 §2.2).
  it('lists visits and interviews together', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    expect(screen.getByText('row-visit')).toBeInTheDocument()
    expect(screen.getByText('row-talk')).toBeInTheDocument()
  })

  it('drops a kind from the list when its chip is turned off', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    await userEvent.click(screen.getByRole('button', { name: 'schedules.kind.interview' }))
    expect(screen.getByText('row-visit')).toBeInTheDocument()
    expect(screen.queryByText('row-talk')).toBeNull()
  })

  // 상태 필터는 목록에만 있다(판정 R26)
  it('offers the status filter only in the list view', async () => {
    render(<SchedulesPage />)
    expect(screen.queryByRole('radiogroup', { name: 'schedules.statusFilterLabel' })).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    expect(
      screen.getByRole('radiogroup', { name: 'schedules.statusFilterLabel' }),
    ).toBeInTheDocument()
  })

  it('lets an admin open the schedule form', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('button', { name: /calendar.addSchedule/ }))
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument()
  })

  it('lets an admin open the event form', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('button', { name: /schedules.addEvent/ }))
    expect(screen.getByTestId('event-form')).toBeInTheDocument()
  })
})
