import { render } from '@testing-library/react'
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
