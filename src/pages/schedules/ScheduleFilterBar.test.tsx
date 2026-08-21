import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { ScheduleFilterBar } from './ScheduleFilterBar'
import { SCHEDULE_KINDS, type ScheduleKind } from './scheduleFilters'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter', () => ({
  ScheduleDateRangeFilter: () => <div data-testid="range-filter" />,
}))

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

  it('renders no region chips when there is nothing to choose between', () => {
    renderBar({ regions: [{ id: 'r1', name: '서울' }] })
    expect(screen.queryByRole('group', { name: 'schedules.regionFilterLabel' })).toBeNull()
  })

  it('offers an all-regions choice alongside each region', async () => {
    const props = renderBar({
      regions: [
        { id: 'r1', name: '서울' },
        { id: 'r2', name: '부산' },
      ],
      regionId: 'r1',
    })
    await userEvent.click(screen.getByRole('button', { name: 'common.all' }))
    expect(props.onRegionChange).toHaveBeenCalledWith(null)
    await userEvent.click(screen.getByRole('button', { name: '부산' }))
    expect(props.onRegionChange).toHaveBeenCalledWith('r2')
  })

  it('offers the status filter as a single-choice control', () => {
    renderBar()
    expect(
      screen.getByRole('radiogroup', { name: 'schedules.statusFilterLabel' }),
    ).toBeInTheDocument()
  })

  // 달력은 격자 자체가 시간을 표현한다 — 예정만 남기면 격자에 구멍이 날 뿐이다(판정 R26).
  it('hides the status filter when asked', () => {
    renderBar({ hideStatus: true })
    expect(screen.queryByRole('radiogroup', { name: 'schedules.statusFilterLabel' })).toBeNull()
  })

  it('always offers the date range', () => {
    renderBar()
    expect(screen.getByTestId('range-filter')).toBeInTheDocument()
  })

  // 스펙 §3: 선택 상태는 배경 채움 + 글자 무게로만.
  it('never marks a selected chip with a left accent stripe', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'ScheduleFilterBar.module.scss'), 'utf8'))
  })
})
