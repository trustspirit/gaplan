import { render, screen, within } from '@testing-library/react'
import { ScheduleListPanel } from './ScheduleListPanel'
import { buildBoardItems, filterByStatus, SCHEDULE_KINDS } from './scheduleFilters'
import type { Schedule } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // calendar.monthTitleFormat은 화면에 보이는 문구가 아니라 dayjs 포맷 템플릿이다.
    // 키를 그대로 돌려주면 dayjs가 글자마다 토큰으로 해석해
    // "camlen0amr.0ont12TitleFor0amt" 같은 걸 만든다. 이 키만 실제 템플릿을 주고
    // 나머지는 관례대로 키를 돌려준다.
    t: (k: string) => (k === 'calendar.monthTitleFormat' ? 'YYYY년 M월' : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
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

const TODAY = '2026-03-10'

function itemsOf(schedules: Schedule[]) {
  return buildBoardItems({
    schedules,
    generalSchedules: [],
    kinds: [...SCHEDULE_KINDS],
    range: { start: '2026-01-01', end: '2026-12-31' },
  })
}

function renderPanel(over: Partial<React.ComponentProps<typeof ScheduleListPanel>> = {}) {
  const items = itemsOf([
    schedule({ id: 'past', date: '2026-03-01' }),
    schedule({ id: 'today', date: '2026-03-10' }),
    schedule({ id: 'next', date: '2026-04-05' }),
  ])
  render(
    <ScheduleListPanel
      items={items}
      visible={items}
      today={TODAY}
      renderItem={(item) => <li key={item.key}>{item.key}</li>}
      {...over}
    />,
  )
  return items
}

describe('ScheduleListPanel', () => {
  it('shows the three counts', () => {
    renderPanel()
    for (const label of ['schedules.thisMonth', 'schedules.upcoming', 'schedules.completed']) {
      expect(screen.getByRole('group', { name: label })).toBeInTheDocument()
    }
  })

  // 판정 R27 — 「예정 2」를 보고 예정 탭을 눌렀을 때 2개가 나와야 한다.
  // 지표는 상태 필터를 반영하지 않는 목록으로 센다.
  //
  // StatCard는 role="group" + aria-labelledby(라벨)로 렌더하므로, 라벨로 타일을
  // 집어 그 안의 숫자를 읽으면 세 타일을 확실히 구분할 수 있다.
  it('counts off the unfiltered list even when the list itself is filtered', () => {
    const items = itemsOf([
      schedule({ id: 'past', date: '2026-03-01' }),
      schedule({ id: 'today', date: '2026-03-10' }),
      schedule({ id: 'next', date: '2026-04-05' }),
    ])
    render(
      <ScheduleListPanel
        items={items}
        visible={filterByStatus(items, 'completed', TODAY)}
        today={TODAY}
        renderItem={(item) => <li key={item.key}>{item.key}</li>}
      />,
    )
    const upcoming = screen.getByRole('group', { name: 'schedules.upcoming' })
    expect(within(upcoming).getByText('2')).toBeInTheDocument()
    // 목록은 완료 하나만 남았는데도 지표는 여전히 예정 2를 말한다
    expect(screen.getByText('s-past')).toBeInTheDocument()
    expect(screen.queryByText('s-today')).toBeNull()
  })

  it('groups rows under a month heading, oldest month first', () => {
    renderPanel()
    const headings = screen.getAllByRole('heading')
    expect(headings.map((h) => h.textContent)).toEqual(['2026년 3월', '2026년 4월'])
  })

  it('says so when the filters leave nothing', () => {
    renderPanel({ visible: [] })
    expect(screen.getByText('schedules.emptyTitle')).toBeInTheDocument()
  })

  // 필터로 목록이 비어도 지표는 남는다 — 무엇을 걸러냈는지 알 수 있어야 한다.
  it('keeps the counts visible when the filtered list is empty', () => {
    renderPanel({ visible: [] })
    expect(screen.getByRole('group', { name: 'schedules.upcoming' })).toBeInTheDocument()
  })
})
