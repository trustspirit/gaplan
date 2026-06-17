import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VisitCountBarChart } from './VisitCountBarChart'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('VisitCountBarChart', () => {
  it('방문 0건 항목도 데이터 없음 대신 0으로 표시한다', () => {
    render(<VisitCountBarChart data={[{ id: 'r1', name: '서울 지역', count: 0 }]} />)

    expect(screen.getByText('서울 지역')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('stats.noData')).not.toBeInTheDocument()
  })
})
