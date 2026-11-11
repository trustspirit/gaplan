import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangePicker } from './DateRangePicker'
import type { DateRange } from './dateRange'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // 달 제목 포맷만은 실제 dayjs 포맷 문자열이어야 한다 — 키를 그대로 돌려주면 dayjs가 그 키를 포맷한다.
    t: (k: string) => (k === 'calendar.monthTitleFormat' ? 'YYYY-MM' : k),
  }),
}))

function renderPicker(value: DateRange, onChange = vi.fn(), initialMonth?: string) {
  render(
    <DateRangePicker
      label="날짜"
      value={value}
      onChange={onChange}
      initialMonth={initialMonth}
      formatDay={(d) => d}
    />,
  )
  return onChange
}

describe('DateRangePicker', () => {
  it('선택이 없으면 initialMonth의 달을 보여주고 안내 문구를 띄운다', () => {
    renderPicker({ start: '', end: '' }, vi.fn(), '2026-12-10')
    expect(screen.getByText('2026-12')).toBeInTheDocument()
    expect(screen.getByText('generalSchedule.dateRangeEmpty')).toBeInTheDocument()
  })

  it('선택이 있으면 시작일의 달을 보여주고 범위를 요약한다', () => {
    renderPicker({ start: '2026-09-03', end: '2026-09-04' })
    expect(screen.getByText('2026-09')).toBeInTheDocument()
    expect(screen.getByText('2026-09-03 – 2026-09-04')).toBeInTheDocument()
  })

  it('범위 안의 날짜만 눌린 상태로 표시한다', () => {
    renderPicker({ start: '2026-09-03', end: '2026-09-05' })
    expect(screen.getByRole('button', { name: '2026-09-02' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '2026-09-03' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '2026-09-04' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '2026-09-05' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '2026-09-06' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('빈 상태에서 날짜를 누르면 그날 하루짜리로 onChange를 부른다', () => {
    const onChange = renderPicker({ start: '', end: '' }, vi.fn(), '2026-12-10')
    fireEvent.click(screen.getByRole('button', { name: '2026-12-03' }))
    expect(onChange).toHaveBeenCalledWith({ start: '2026-12-03', end: '' })
  })

  it('다음 달로 넘겨서 종료일을 고를 수 있다', () => {
    const onChange = renderPicker({ start: '2026-11-29', end: '' })
    fireEvent.click(screen.getByRole('button', { name: 'generalSchedule.nextMonth' }))
    fireEvent.click(screen.getByRole('button', { name: '2026-12-02' }))
    expect(onChange).toHaveBeenCalledWith({ start: '2026-11-29', end: '2026-12-02' })
  })
})
