import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarView } from './CalendarView'

// 이 파일은 Task 5가 도입한 controlled/uncontrolled 프롭 계약만 다룬다.
// 격자 배치 로직(주 뷰의 겹침 처리 등)은 layoutDayBlocks.test.ts가 이미 덮는다.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('CalendarView — view prop contract', () => {
  it('uncontrolled: renders the internal toggle and switches view on click', async () => {
    const { container } = render(<CalendarView schedules={[]} generalSchedules={[]} />)

    expect(screen.getByRole('button', { name: 'common.monthView' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.weekView' })).toBeInTheDocument()

    // month view's period label never contains an en dash; only the week
    // view's "M/D – M/D" label does.
    expect(container.textContent).not.toMatch(/–/)

    await userEvent.click(screen.getByRole('button', { name: 'common.weekView' }))

    expect(container.textContent).toMatch(/–/)
  })

  it('controlled: does not render the internal toggle', () => {
    render(<CalendarView schedules={[]} generalSchedules={[]} view="month" />)

    expect(screen.queryByRole('button', { name: 'common.monthView' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'common.weekView' })).toBeNull()
  })

  it('controlled: renders the view it was handed, not defaultView', () => {
    const { container } = render(<CalendarView schedules={[]} generalSchedules={[]} view="week" />)

    // defaultView would default to 'month' (no dash) if the prop were ignored.
    expect(container.textContent).toMatch(/–/)
  })
})
