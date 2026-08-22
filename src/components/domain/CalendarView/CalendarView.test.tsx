import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GeneralSchedule } from '@/types'
import { CalendarView } from './CalendarView'

// view는 필수 프롭이고, 이 컴포넌트에는 더 이상 내부 상태로 뷰를 바꾸는 경로가
// 없다(Task 8 — 유일한 소비자인 ScheduleCalendarPanel이 항상 view를 넘긴다).
// 그래서 이 파일이 다루는 계약은 하나뿐이다: 넘겨받은 view가 실제로 렌더
// 결과를 바꾸는가. 격자 배치 로직(주 뷰의 겹침 처리 등)은
// layoutDayBlocks.test.ts가 이미 덮는다.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('CalendarView — view prop contract', () => {
  it('renders the month grid when given view="month"', () => {
    const { container } = render(<CalendarView schedules={[]} generalSchedules={[]} view="month" />)

    // month view's period label never contains an en dash; only the week
    // view's "M/D – M/D" label does.
    expect(container.textContent).not.toMatch(/–/)
  })

  it('renders the week grid when given view="week"', () => {
    const { container } = render(<CalendarView schedules={[]} generalSchedules={[]} view="week" />)

    expect(container.textContent).toMatch(/–/)
  })
})

// event-toast-and-multiday brief §2-3: 1박 2일 등 여러 날에 걸친 행사가 달력 격자에서
// 그 범위의 날마다(시작일뿐 아니라) 보여야 한다 — eventCoversDate로 판정한다.
describe('CalendarView — multi-day general schedules', () => {
  function event(over: Partial<GeneralSchedule> = {}): GeneralSchedule {
    return {
      id: 'e1',
      title: '1박2일 수련회',
      date: '2026-09-03',
      category: 'conference',
      createdBy: 'admin',
      createdAt: '2026-08-01',
      isPublic: true,
      ...over,
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-10T00:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a multi-day event chip on every day it spans, not just the start day', () => {
    const multiDay = event({ date: '2026-09-03', endDate: '2026-09-04' })
    render(<CalendarView schedules={[]} generalSchedules={[multiDay]} view="month" />)

    expect(screen.getAllByTitle('1박2일 수련회')).toHaveLength(2)
  })

  it('still shows a single-day event chip only once', () => {
    const oneDay = event({ date: '2026-09-03' })
    render(<CalendarView schedules={[]} generalSchedules={[oneDay]} view="month" />)

    expect(screen.getAllByTitle('1박2일 수련회')).toHaveLength(1)
  })
})

// 칩 글자는 nowrap이라 min-content가 곧 제목 전체 폭이다. 트랙이 `1fr`
// (= minmax(auto, 1fr))이면 그 min-content 아래로 못 줄어들어 7열 합계가
// 컨테이너를 넘고, monthGrid의 overflow:hidden이 마지막 열(토)을 잘라낸다.
describe('CalendarView — month grid fits its container', () => {
  const scss = () => readFileSync(resolve(__dirname, 'CalendarView.module.scss'), 'utf8')

  it('lets the seven tracks shrink below their content', () => {
    const track = /\.monthGrid\s*\{[^}]*grid-template-columns:\s*([^;]+);/.exec(scss())
    expect(track?.[1].trim()).toBe('repeat(7, minmax(0, 1fr))')
  })

  it('lets a day cell shrink below its chips', () => {
    const cell = /\.cell\s*\{([^}]*)\}/.exec(scss())
    expect(cell?.[1]).toMatch(/min-width:\s*0/)
  })
})
