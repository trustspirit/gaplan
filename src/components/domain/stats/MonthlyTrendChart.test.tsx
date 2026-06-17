import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MonthlyTrendChart } from './MonthlyTrendChart'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MonthlyTrendChart', () => {
  it('월별 데이터가 있지만 방문이 0건이면 0건 문구를 표시한다', () => {
    render(<MonthlyTrendChart data={[{ month: '2026-06', count: 0 }]} />)

    expect(screen.getByText('stats.noVisitsInPeriod')).toBeInTheDocument()
  })
})
