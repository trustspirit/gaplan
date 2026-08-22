import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import type { GeneralSchedule } from '@/types'
import { GeneralEventItem } from './GeneralEventItem'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

function event(over: Partial<GeneralSchedule> = {}): GeneralSchedule {
  return {
    id: 'e1',
    title: '지역대회',
    date: '2099-01-01',
    category: 'conference',
    createdBy: 'a1',
    createdAt: '2026-01-01',
    isPublic: true,
    ...over,
  } as GeneralSchedule
}

const noop = () => {}

describe('GeneralEventItem', () => {
  // 참석하기 버튼 제거 회귀 방지: 참석 관련 props 없이도 정상 렌더된다.
  it('renders the title and the category badge without any attend-related props', () => {
    render(<GeneralEventItem event={event()} onClick={noop} />)
    expect(screen.getByText('지역대회')).toBeInTheDocument()
    expect(screen.getByText('generalSchedule.category.conference')).toBeInTheDocument()
  })

  it('calls onClick when the row is clicked', async () => {
    const onClick = vi.fn()
    render(<GeneralEventItem event={event()} onClick={onClick} />)
    await userEvent.click(screen.getByText('지역대회'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('offers the visibility toggle only when canToggleVisibility is set', async () => {
    const onToggleVisibility = vi.fn()
    const { rerender } = render(
      <GeneralEventItem
        event={event({ isPublic: true })}
        onToggleVisibility={onToggleVisibility}
        onClick={noop}
      />,
    )
    expect(screen.queryByLabelText('generalSchedule.hideFromPublic')).not.toBeInTheDocument()

    rerender(
      <GeneralEventItem
        event={event({ isPublic: true })}
        canToggleVisibility
        onToggleVisibility={onToggleVisibility}
        onClick={noop}
      />,
    )
    const toggleBtn = screen.getByLabelText('generalSchedule.hideFromPublic')
    await userEvent.click(toggleBtn)
    expect(onToggleVisibility).toHaveBeenCalledTimes(1)
  })

  it('shows the show-to-public label once the event is hidden', () => {
    render(
      <GeneralEventItem
        event={event({ isPublic: false })}
        canToggleVisibility
        onToggleVisibility={noop}
        onClick={noop}
      />,
    )
    expect(screen.getByLabelText('generalSchedule.showToPublic')).toBeInTheDocument()
  })

  it('shows the time range only when both start and end time are set', () => {
    const { rerender } = render(<GeneralEventItem event={event()} onClick={noop} />)
    expect(screen.queryByText(/–/)).not.toBeInTheDocument()

    rerender(
      <GeneralEventItem
        event={event({ startTime: '10:00', endTime: '12:00' })}
        onClick={noop}
      />,
    )
    expect(screen.getByText('10:00 – 12:00')).toBeInTheDocument()
  })

  // 판정 R57 — 행 앞의 색 막대 금지.
  it('never puts a colour bar in front of the row', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'GeneralEventItem.module.scss'), 'utf8'))
  })
})
