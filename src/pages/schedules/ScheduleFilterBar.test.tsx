import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { ScheduleFilterBar } from './ScheduleFilterBar'
import { SCHEDULE_KINDS, type ScheduleKind } from './scheduleFilters'

// ResponsiveDialog reaches into useIsMobile, which calls window.matchMedia —
// jsdom doesn't implement it. Repo convention is to mock the hook directly
// rather than polyfill matchMedia.
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter', () => ({
  ScheduleDateRangeFilter: () => <div data-testid="range-filter" />,
}))

const TWO_REGIONS = [
  { id: 'r1', name: '서울' },
  { id: 'r2', name: '서울남' },
]

function renderBar(over: Partial<React.ComponentProps<typeof ScheduleFilterBar>> = {}) {
  const props = {
    kinds: [...SCHEDULE_KINDS] as ScheduleKind[],
    onKindsChange: vi.fn(),
    regions: [],
    regionId: null,
    onRegionChange: vi.fn(),
    status: 'all' as const,
    onStatusChange: vi.fn(),
    rangeSetting: { preset: 'rolling' as const },
    range: { start: '2026-01-01', end: '2026-12-31' },
    onRangeChange: vi.fn(),
    ...over,
  }
  render(<ScheduleFilterBar {...props} />)
  return props
}

describe('ScheduleFilterBar', () => {
  it('groups the kind chips under a named group', () => {
    renderBar()
    expect(screen.getByRole('group', { name: 'schedules.kindFilterLabel' })).toBeInTheDocument()
  })

  it('marks every kind as on by default', () => {
    renderBar()
    for (const kind of SCHEDULE_KINDS) {
      expect(screen.getByRole('button', { name: `schedules.kind.${kind}` })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    }
  })

  // 다중 선택임이 한눈에 보이도록, 켜진 칩에는 체크 표시가 있다 (지역 단일 선택 시트와 구분).
  it('shows a check mark on every kind chip that is on, and none that are off', () => {
    renderBar({ kinds: ['visit'] })
    expect(
      screen.getByRole('button', { name: 'schedules.kind.visit' }).querySelector('svg'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'schedules.kind.event' }).querySelector('svg'),
    ).toBeNull()
  })

  // 배타 탭이 아니라 다중 선택이다(판정 R23) — 하나를 꺼도 나머지는 켜져 있다.
  it('turns one kind off without touching the others', async () => {
    const props = renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'schedules.kind.event' }))
    expect(props.onKindsChange).toHaveBeenCalledWith(['visit', 'interview'])
  })

  it('turns a kind back on', async () => {
    const props = renderBar({ kinds: ['visit'] })
    await userEvent.click(screen.getByRole('button', { name: 'schedules.kind.event' }))
    expect(props.onKindsChange).toHaveBeenCalledWith(['visit', 'event'])
  })

  // 전부 끄면 빈 화면만 남고 되돌릴 실마리가 없다. 마지막 하나는 못 끈다.
  it('refuses to turn off the last kind that is still on', async () => {
    const props = renderBar({ kinds: ['visit'] })
    const chip = screen.getByRole('button', { name: 'schedules.kind.visit' })
    expect(chip).toBeDisabled()
    await userEvent.click(chip)
    expect(props.onKindsChange).not.toHaveBeenCalled()
  })

  it('always offers the date range', () => {
    renderBar()
    expect(screen.getByTestId('range-filter')).toBeInTheDocument()
  })

  // 스펙 §3: 선택 상태는 배경 채움 + 글자 무게로만.
  it('never marks a selected chip with a left accent stripe', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'ScheduleFilterBar.module.scss'), 'utf8'))
  })

  describe('filter button', () => {
    it('is not rendered when there is nothing to filter behind it', () => {
      renderBar({ regions: [], hideStatus: true })
      expect(screen.queryByRole('button', { name: /common\.filter/ })).toBeNull()
    })

    it('is rendered when there are regions to choose between, even with status hidden', () => {
      renderBar({ regions: TWO_REGIONS, hideStatus: true })
      expect(screen.getByRole('button', { name: /common\.filter/ })).toBeInTheDocument()
    })

    it('is rendered when status is visible, even with no regions', () => {
      renderBar({ regions: [] })
      expect(screen.getByRole('button', { name: /common\.filter/ })).toBeInTheDocument()
    })

    it('carries no badge when nothing is filtered', () => {
      renderBar({ regions: TWO_REGIONS, regionId: null, status: 'all' })
      const button = screen.getByRole('button', { name: /common\.filter/ })
      expect(button).toHaveTextContent(/^common\.filter$/)
    })

    it('badges the active filter count, matching activeFilterCount', () => {
      renderBar({ regions: TWO_REGIONS, regionId: 'r1', status: 'upcoming' })
      const button = screen.getByRole('button', { name: /common\.filter/ })
      expect(button).toHaveTextContent('2')
    })
  })

  describe('the sheet behind the filter button', () => {
    it('applies a picked region back through onRegionChange', async () => {
      const props = renderBar({ regions: TWO_REGIONS, regionId: 'r1' })
      await userEvent.click(screen.getByRole('button', { name: /common\.filter/ }))
      await userEvent.click(screen.getByRole('radio', { name: '서울남' }))
      await userEvent.click(screen.getByRole('button', { name: 'common.apply' }))
      expect(props.onRegionChange).toHaveBeenCalledWith('r2')
    })

    it('applies the all-regions choice back through onRegionChange', async () => {
      const props = renderBar({ regions: TWO_REGIONS, regionId: 'r1' })
      await userEvent.click(screen.getByRole('button', { name: /common\.filter/ }))
      await userEvent.click(screen.getByRole('radio', { name: 'common.all' }))
      await userEvent.click(screen.getByRole('button', { name: 'common.apply' }))
      expect(props.onRegionChange).toHaveBeenCalledWith(null)
    })

    // 시트가 목록을 가리고 있어 즉시 반영해도 소용없다 — 배경을 탭해 닫으면 고른 게 버려진다.
    it('drops the pick and leaves onRegionChange uncalled when the backdrop is tapped', async () => {
      const props = renderBar({ regions: TWO_REGIONS, regionId: 'r1' })
      await userEvent.click(screen.getByRole('button', { name: /common\.filter/ }))
      await userEvent.click(screen.getByRole('radio', { name: '서울남' }))
      await userEvent.click(screen.getByRole('dialog').parentElement!)
      expect(props.onRegionChange).not.toHaveBeenCalled()
    })

    it('resets to region null and status all once Apply is pressed', async () => {
      const props = renderBar({ regions: TWO_REGIONS, regionId: 'r1', status: 'completed' })
      await userEvent.click(screen.getByRole('button', { name: /common\.filter/ }))
      await userEvent.click(screen.getByRole('button', { name: 'common.reset' }))
      await userEvent.click(screen.getByRole('button', { name: 'common.apply' }))
      expect(props.onRegionChange).toHaveBeenCalledWith(null)
      expect(props.onStatusChange).toHaveBeenCalledWith('all')
    })

    it('offers no region section when there is nothing to choose between', async () => {
      renderBar({ regions: [{ id: 'r1', name: '서울' }] })
      await userEvent.click(screen.getByRole('button', { name: /common\.filter/ }))
      expect(screen.queryByRole('radiogroup', { name: 'schedules.regionFilterLabel' })).toBeNull()
    })

    // 달력은 격자 자체가 시간을 표현한다 — 예정만 남기면 격자에 구멍이 날 뿐이다(판정 R26).
    it('offers no status section when hideStatus is set', async () => {
      renderBar({ regions: TWO_REGIONS, hideStatus: true })
      await userEvent.click(screen.getByRole('button', { name: /common\.filter/ }))
      expect(
        screen.queryByRole('radiogroup', { name: 'schedules.statusFilterLabel' }),
      ).toBeNull()
    })
  })
})
