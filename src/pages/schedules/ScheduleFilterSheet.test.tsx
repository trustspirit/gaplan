import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleFilterSheet } from './ScheduleFilterSheet'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

const REGIONS = [
  { id: 'r1', name: '서울' },
  { id: 'r2', name: '서울남' },
]

function renderSheet(over: Partial<React.ComponentProps<typeof ScheduleFilterSheet>> = {}) {
  const props = {
    open: true,
    regions: REGIONS,
    regionId: null,
    status: 'all' as const,
    hideStatus: false,
    onApply: vi.fn(),
    onClose: vi.fn(),
    ...over,
  }
  render(<ScheduleFilterSheet {...props} />)
  return props
}

describe('ScheduleFilterSheet', () => {
  it('renders region and status as true radio groups, not toggle buttons', () => {
    renderSheet()
    expect(
      screen.getByRole('radiogroup', { name: 'schedules.regionFilterLabel' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: 'schedules.statusFilterLabel' }),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('button').some((b) => b.hasAttribute('aria-pressed'))).toBe(
      false,
    )
  })

  it('shows the region and status headings visibly, not screen-reader-only', () => {
    renderSheet()
    expect(screen.getByText('schedules.regionFilterLabel')).toBeVisible()
    expect(screen.getByText('schedules.statusFilterLabel')).toBeVisible()
  })

  // 지역이 하나 이하면 고를 것이 없다.
  it('renders no region section when there is nothing to choose between', () => {
    renderSheet({ regions: [REGIONS[0]] })
    expect(screen.queryByRole('radiogroup', { name: 'schedules.regionFilterLabel' })).toBeNull()
  })

  it('renders no status section when hideStatus is set', () => {
    renderSheet({ hideStatus: true })
    expect(screen.queryByRole('radiogroup', { name: 'schedules.statusFilterLabel' })).toBeNull()
  })

  // 시트가 목록을 가리고 있어 즉시 반영해도 효과를 볼 수 없다 — 적용을 눌러야 반영된다.
  it('only calls onApply once Apply is pressed, with the picked region', async () => {
    const props = renderSheet({ regionId: null })
    await userEvent.click(screen.getByRole('radio', { name: '서울남' }))
    expect(props.onApply).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'common.apply' }))
    expect(props.onApply).toHaveBeenCalledWith({ regionId: 'r2', status: 'all' })
  })

  // 배경 탭/닫기로 나가면 고른 것을 버린다 — onApply가 불리면 안 된다.
  it('discards the pick and calls onClose, not onApply, when the sheet is dismissed', async () => {
    const props = renderSheet({ regionId: null })
    await userEvent.click(screen.getByRole('radio', { name: '서울남' }))
    await userEvent.click(screen.getByRole('dialog').parentElement!)
    expect(props.onApply).not.toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  // 초기화는 즉시 적용하지 않는다 — 여전히 적용을 눌러야 한다.
  it('Reset clears pending values but still needs Apply to take effect', async () => {
    const props = renderSheet({ regionId: 'r1', status: 'completed' })
    await userEvent.click(screen.getByRole('button', { name: 'common.reset' }))
    expect(props.onApply).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'common.apply' }))
    expect(props.onApply).toHaveBeenCalledWith({ regionId: null, status: 'all' })
  })

  // 시트를 다시 열 때 지난 미적용 선택이 새어 나오면 안 된다 — props 값으로 다시 감아야 한다.
  it('re-initializes pending from props each time it reopens, discarding a stale pick', async () => {
    const props = { regions: REGIONS, status: 'all' as const, hideStatus: false, onApply: vi.fn(), onClose: vi.fn() }
    const { rerender } = render(
      <ScheduleFilterSheet open regionId="r1" {...props} />,
    )
    await userEvent.click(screen.getByRole('radio', { name: '서울남' })) // pending -> r2, never applied

    rerender(<ScheduleFilterSheet open={false} regionId="r1" {...props} />) // dismissed without applying
    rerender(<ScheduleFilterSheet open regionId="r1" {...props} />) // reopened with the original prop value

    expect(screen.getByRole('radio', { name: '서울' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '서울남' })).not.toBeChecked()
  })
})
