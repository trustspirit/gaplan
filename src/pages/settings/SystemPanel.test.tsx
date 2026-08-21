import { render, screen } from '@testing-library/react'
import { SystemPanel } from './SystemPanel'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('./CalendarLinkCard', () => ({
  CalendarLinkCard: () => <div data-testid="calendar-link" />,
}))
vi.mock('@/pages/admin/AvailabilitySettings', () => ({
  AvailabilitySettings: () => <div data-testid="availability" />,
}))

describe('SystemPanel', () => {
  it('carries the calendar link card', () => {
    render(<SystemPanel />)
    expect(screen.getByTestId('calendar-link')).toBeInTheDocument()
  })

  // 판정 R52 — 이 화면은 링크가 없어 아무도 도달할 수 없었다. 여기서 처음 열린다.
  it('carries the availability defaults that had no link before', () => {
    render(<SystemPanel />)
    expect(screen.getByTestId('availability')).toBeInTheDocument()
  })
})
