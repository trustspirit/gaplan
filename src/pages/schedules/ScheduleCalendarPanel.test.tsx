import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleCalendarPanel } from './ScheduleCalendarPanel'
import { buildBoardItems, SCHEDULE_KINDS } from './scheduleFilters'
import type { Schedule } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

// CalendarView는 여기서 일부러 목으로 대체한다 — 이 파일은 패널의 배선(뷰
// 모드 전달, 날짜 선택 처리)만 본다. CalendarView 자체의 controlled/
// uncontrolled 계약은 CalendarView.test.tsx가 따로 다룬다.
vi.mock('@/components/domain/CalendarView/CalendarView', () => ({
  CalendarView: ({ view, onDateClick }: { view?: string; onDateClick?: (d: string) => void }) => (
    <div>
      <span data-testid="view-mode">{view}</span>
      <button type="button" onClick={() => onDateClick?.('2026-03-10')}>
        pick-day
      </button>
    </div>
  ),
}))

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
    createdBy: 'admin',
    ...over,
  }
}

function renderPanel(over: Partial<React.ComponentProps<typeof ScheduleCalendarPanel>> = {}) {
  const schedules = [
    schedule({ id: 'onday', date: '2026-03-10' }),
    schedule({ id: 'otherday', date: '2026-03-20' }),
  ]
  const items = buildBoardItems({
    schedules,
    generalSchedules: [],
    kinds: [...SCHEDULE_KINDS],
    range: { start: '2026-01-01', end: '2026-12-31' },
  })
  const props = {
    view: 'month' as const,
    schedules,
    generalSchedules: [],
    items,
    getUnitName: (id: string) => id,
    selectedDate: null as string | null,
    onSelectDate: vi.fn(),
    renderItem: (item: (typeof items)[number]) => <li key={item.key}>{item.key}</li>,
    ...over,
  }
  render(<ScheduleCalendarPanel {...props} />)
  return props
}

describe('ScheduleCalendarPanel', () => {
  it('hands the calendar the view the page owns', () => {
    renderPanel({ view: 'week' })
    expect(screen.getByTestId('view-mode')).toHaveTextContent('week')
  })

  it('lists every item in range when no day is selected', () => {
    renderPanel()
    expect(screen.getByText('s-onday')).toBeInTheDocument()
    expect(screen.getByText('s-otherday')).toBeInTheDocument()
  })

  it('narrows the list to the selected day', () => {
    renderPanel({ selectedDate: '2026-03-10' })
    expect(screen.getByText('s-onday')).toBeInTheDocument()
    expect(screen.queryByText('s-otherday')).toBeNull()
  })

  it('reports a day the calendar was clicked on', async () => {
    const props = renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'pick-day' }))
    expect(props.onSelectDate).toHaveBeenCalledWith('2026-03-10')
  })

  // 같은 날을 다시 누르면 선택이 풀린다 — 옛 CalendarPage의 동작이다.
  it('clears the selection when the same day is clicked again', async () => {
    const props = renderPanel({ selectedDate: '2026-03-10' })
    await userEvent.click(screen.getByRole('button', { name: 'pick-day' }))
    expect(props.onSelectDate).toHaveBeenCalledWith(null)
  })

  it('offers a way out of a day selection', async () => {
    const props = renderPanel({ selectedDate: '2026-03-10' })
    await userEvent.click(screen.getByRole('button', { name: 'calendar.clearSelection' }))
    expect(props.onSelectDate).toHaveBeenCalledWith(null)
  })

  it('says so when the selected day has nothing on it', () => {
    renderPanel({ selectedDate: '2026-06-01' })
    expect(screen.getByText('schedules.emptyTitle')).toBeInTheDocument()
  })
})
