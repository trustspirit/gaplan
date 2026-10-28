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

  describe('filter select styles', () => {
    const scss = readFileSync(resolve(__dirname, 'ScheduleFilterBar.module.scss'), 'utf8')
    const block = (selector: string) => {
      const start = scss.indexOf(`${selector} {`)
      expect(start, selector).toBeGreaterThan(-1)
      let depth = 0
      for (let i = scss.indexOf('{', start); i < scss.length; i++) {
        if (scss[i] === '{') depth++
        if (scss[i] === '}' && --depth === 0) return scss.slice(start, i + 1)
      }
      throw new Error(`${selector} 블록을 닫는 괄호를 찾지 못했다`)
    }

    // 16px 미만이면 iOS Safari가 포커스할 때 화면을 확대한다 (_variables.scss의 control 토큰 주석).
    it('keeps the select font at 16px on mobile', () => {
      const mobile = block('.select').slice(block('.select').indexOf('@include mobile'))
      expect(mobile).toMatch(/font-size:\s*\$font-size-base\s*!important/)
    })

    // 긴 지역 이름이 들어오면 줄어들지 못하는 셀렉트가 좁은 화면 밖으로 삐져나간다.
    it('lets a select box shrink below its longest option', () => {
      // 라벨(> label)은 줄지 않아도 된다 — 상자 자신의 선언만 본다.
      const own = block('.selectWrapper')
        .replace(/^[^{]*\{/, '')
        .replace(/[^;{}]*\{[^{}]*\}/g, '')
      expect(own).not.toMatch(/flex-shrink:\s*0/)
    })
  })

  // Select는 placeholder를 넘겼든 아니든 value=""인 옵션을 하나 렌더한다. 그래서 "전체"를
  // 별도 옵션으로 또 넣으면 빈 항목이 두 개 뜬다 — 사용자가 실제로 본 결함이다.
  describe('the empty slot is not duplicated', () => {
    it('gives the region select exactly one empty-valued option, labelled 전체', () => {
      renderBar({ regions: TWO_REGIONS })
      const select = screen.getByRole('combobox', { name: 'schedules.regionFilterLabel' })
      const blanks = Array.from(select.querySelectorAll('option')).filter((o) => o.value === '')
      expect(blanks).toHaveLength(1)
      expect(blanks[0]).toHaveTextContent('common.all')
    })

    it('gives the status select exactly one empty-valued option, labelled 전체', () => {
      renderBar()
      const select = screen.getByRole('combobox', { name: 'schedules.statusFilterLabel' })
      const blanks = Array.from(select.querySelectorAll('option')).filter((o) => o.value === '')
      expect(blanks).toHaveLength(1)
      expect(blanks[0]).toHaveTextContent('schedules.status.all')
    })

    // '' 는 ScheduleStatusFilter가 아니다 — 빈 값을 골라도 'all'로 올라가야 한다.
    it("reports the status select's empty choice as 'all', never as ''", async () => {
      const props = renderBar({ status: 'upcoming' })
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'schedules.statusFilterLabel' }),
        '',
      )
      expect(props.onStatusChange).toHaveBeenCalledWith('all')
    })
  })

  describe('region select', () => {
    it('is not rendered when there is nothing to choose between', () => {
      renderBar({ regions: [] })
      expect(screen.queryByRole('combobox', { name: 'schedules.regionFilterLabel' })).toBeNull()
    })

    it('is rendered when there are regions to choose between', () => {
      renderBar({ regions: TWO_REGIONS })
      expect(
        screen.getByRole('combobox', { name: 'schedules.regionFilterLabel' }),
      ).toBeInTheDocument()
    })

    it('calls onRegionChange with the picked region id', async () => {
      const props = renderBar({ regions: TWO_REGIONS, regionId: null })
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'schedules.regionFilterLabel' }),
        'r2',
      )
      expect(props.onRegionChange).toHaveBeenCalledWith('r2')
    })

    // 빈 문자열이 "전체"다 — 유효한 선택이지 미선택 상태가 아니다.
    it('calls onRegionChange(null) when 전체 is picked', async () => {
      const props = renderBar({ regions: TWO_REGIONS, regionId: 'r1' })
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'schedules.regionFilterLabel' }),
        screen.getByRole('option', { name: 'common.all' }),
      )
      expect(props.onRegionChange).toHaveBeenCalledWith(null)
    })
  })

  describe('status select', () => {
    it('is rendered by default', () => {
      renderBar()
      expect(
        screen.getByRole('combobox', { name: 'schedules.statusFilterLabel' }),
      ).toBeInTheDocument()
    })

    // 달력은 격자 자체가 시간을 표현한다 — 예정만 남기면 격자에 구멍이 날 뿐이다(판정 R26).
    it('is not rendered when hideStatus is set', () => {
      renderBar({ hideStatus: true })
      expect(screen.queryByRole('combobox', { name: 'schedules.statusFilterLabel' })).toBeNull()
    })

    it('calls onStatusChange with the picked status', async () => {
      const props = renderBar()
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'schedules.statusFilterLabel' }),
        'completed',
      )
      expect(props.onStatusChange).toHaveBeenCalledWith('completed')
    })
  })
})
