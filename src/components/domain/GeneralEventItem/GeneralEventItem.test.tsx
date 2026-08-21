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
  it('renders the title and the category badge', () => {
    render(
      <GeneralEventItem
        event={event()}
        isAttending={false}
        canAttend={false}
        onAttend={noop}
        onCancelAttend={noop}
        onClick={noop}
      />,
    )
    expect(screen.getByText('지역대회')).toBeInTheDocument()
    expect(screen.getByText('generalSchedule.category.conference')).toBeInTheDocument()
  })

  it('calls onClick when the row is clicked', async () => {
    const onClick = vi.fn()
    render(
      <GeneralEventItem
        event={event()}
        isAttending={false}
        canAttend={false}
        onAttend={noop}
        onCancelAttend={noop}
        onClick={onClick}
      />,
    )
    await userEvent.click(screen.getByText('지역대회'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('offers the attend button only when canAttend is set, and toggles its label', async () => {
    const onAttend = vi.fn()
    const { rerender } = render(
      <GeneralEventItem
        event={event()}
        isAttending={false}
        canAttend={false}
        onAttend={onAttend}
        onCancelAttend={noop}
        onClick={noop}
      />,
    )
    expect(screen.queryByLabelText('generalSchedule.attend')).not.toBeInTheDocument()

    rerender(
      <GeneralEventItem
        event={event()}
        isAttending={false}
        canAttend
        onAttend={onAttend}
        onCancelAttend={noop}
        onClick={noop}
      />,
    )
    const attendBtn = screen.getByLabelText('generalSchedule.attend')
    await userEvent.click(attendBtn)
    expect(onAttend).toHaveBeenCalledTimes(1)
  })

  it('calls onCancelAttend instead of onAttend once already attending', async () => {
    const onCancelAttend = vi.fn()
    const onAttend = vi.fn()
    render(
      <GeneralEventItem
        event={event()}
        isAttending
        canAttend
        onAttend={onAttend}
        onCancelAttend={onCancelAttend}
        onClick={noop}
      />,
    )
    await userEvent.click(screen.getByLabelText('generalSchedule.cancelAttend'))
    expect(onCancelAttend).toHaveBeenCalledTimes(1)
    expect(onAttend).not.toHaveBeenCalled()
  })

  it('clicking the attend button does not also fire the row onClick', async () => {
    const onClick = vi.fn()
    render(
      <GeneralEventItem
        event={event()}
        isAttending={false}
        canAttend
        onAttend={noop}
        onCancelAttend={noop}
        onClick={onClick}
      />,
    )
    await userEvent.click(screen.getByLabelText('generalSchedule.attend'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('offers the visibility toggle only when canToggleVisibility is set', async () => {
    const onToggleVisibility = vi.fn()
    const { rerender } = render(
      <GeneralEventItem
        event={event({ isPublic: true })}
        isAttending={false}
        canAttend={false}
        onAttend={noop}
        onCancelAttend={noop}
        onToggleVisibility={onToggleVisibility}
        onClick={noop}
      />,
    )
    expect(screen.queryByLabelText('generalSchedule.hideFromPublic')).not.toBeInTheDocument()

    rerender(
      <GeneralEventItem
        event={event({ isPublic: true })}
        isAttending={false}
        canAttend={false}
        canToggleVisibility
        onAttend={noop}
        onCancelAttend={noop}
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
        isAttending={false}
        canAttend={false}
        canToggleVisibility
        onAttend={noop}
        onCancelAttend={noop}
        onToggleVisibility={noop}
        onClick={noop}
      />,
    )
    expect(screen.getByLabelText('generalSchedule.showToPublic')).toBeInTheDocument()
  })

  it('shows the time range only when both start and end time are set', () => {
    const { rerender } = render(
      <GeneralEventItem
        event={event()}
        isAttending={false}
        canAttend={false}
        onAttend={noop}
        onCancelAttend={noop}
        onClick={noop}
      />,
    )
    expect(screen.queryByText(/–/)).not.toBeInTheDocument()

    rerender(
      <GeneralEventItem
        event={event({ startTime: '10:00', endTime: '12:00' })}
        isAttending={false}
        canAttend={false}
        onAttend={noop}
        onCancelAttend={noop}
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
