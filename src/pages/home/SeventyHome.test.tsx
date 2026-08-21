import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import type { AppUser, Schedule } from '@/types'
import { deleteScheduleViaCF } from '@/services/scheduleService'
import { SeventyHome } from './SeventyHome'

const SEVENTY = {
  uid: 'sv1',
  role: 'seventy',
  name: '칠십인',
  regionIds: ['seoul'],
  calendarConnected: false,
} as AppUser

const NOW = dayjs()

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: NOW.add(3, 'day').format('YYYY-MM-DD'),
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'a1',
    ...over,
  } as Schedule
}

let schedules: Schedule[] = []
const scheduleDelete = vi.fn((_id: string, doDelete: () => Promise<void>) => doDelete())

beforeEach(() => {
  schedules = [schedule()]
  scheduleDelete.mockClear()
  vi.mocked(deleteScheduleViaCF)
    .mockClear()
    .mockResolvedValue(undefined as never)
})

vi.mock('jotai', () => ({
  useAtomValue: () => SEVENTY,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
// 이 테스트는 ScheduleItem을 진짜로 렌더한다. 그 안의 useIsMobile이 window.matchMedia를
// 부르는데 jsdom에는 없다. 레포 관례(PresidentHome.test.tsx, TopBar.test.tsx)는
// matchMedia를 폴리필하지 않고 훅을 직접 mock하는 것이다.
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useSchedules', () => ({ useSchedules: () => ({ schedules, loading: false }) }))
vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => ({ getUnitName: (id: string) => id, getWardName: (id: string) => id }),
}))
vi.mock('@/hooks/useDeleteWithUndo', () => ({
  useDeleteWithUndo: () => ({ pendingIds: new Set<string>(), scheduleDelete }),
}))
vi.mock('@/services/scheduleService', () => ({ deleteScheduleViaCF: vi.fn() }))
vi.mock('@/components/domain/Reminders/ReminderSummaryBanner', () => ({
  ReminderSummaryBanner: () => <div data-testid="reminders" />,
}))
// 편집 모달은 열렸는지만 본다 — 그 안쪽은 EditScheduleModal 제 테스트 소관이다.
vi.mock('@/components/domain/EditScheduleModal/EditScheduleModal', () => ({
  EditScheduleModal: ({ schedule }: { schedule: Schedule }) => (
    <div data-testid="edit-modal">{schedule.id}</div>
  ),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('SeventyHome', () => {
  it('offers the calendar banner when the calendar is not connected', () => {
    render(<SeventyHome />)
    expect(screen.getByText('schedule.calendarBannerText')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'schedule.calendarSubscribe' })).toBeInTheDocument()
  })

  it('shows the reminder banner', () => {
    render(<SeventyHome />)
    expect(screen.getByTestId('reminders')).toBeInTheDocument()
  })

  it('lists the upcoming schedules', () => {
    render(<SeventyHome />)
    expect(screen.getByText('schedule.upcoming')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is upcoming', () => {
    schedules = []
    render(<SeventyHome />)
    expect(screen.getByText('schedule.noUpcoming')).toBeInTheDocument()
  })

  it('opens the edit modal from a schedule row', async () => {
    render(<SeventyHome />)
    await userEvent.click(screen.getByRole('button', { name: 'common.more' }))
    await userEvent.click(screen.getByRole('button', { name: 'common.edit' }))

    expect(screen.getByTestId('edit-modal')).toHaveTextContent('s1')
  })

  // 삭제는 곧바로 지우지 않고 되돌리기를 낀 헬퍼를 거친다 — 그 계약이 여기 걸린다.
  it('routes a confirmed delete through the undo-aware helper', async () => {
    render(<SeventyHome />)
    await userEvent.click(screen.getByRole('button', { name: 'common.more' }))
    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))

    expect(scheduleDelete).toHaveBeenCalledWith(
      's1',
      expect.any(Function),
      'admin.scheduleCancelSuccess',
    )
    await waitFor(() => expect(deleteScheduleViaCF).toHaveBeenCalledWith('s1'))
  })

  // 판정 R41 — 홈에 지표 타일을 두지 않는다.
  it('draws no stat tiles', () => {
    render(<SeventyHome />)
    expect(screen.queryAllByRole('group')).toHaveLength(0)
  })
})
