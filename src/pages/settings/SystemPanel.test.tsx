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
vi.mock('./users/UserListCard', () => ({ UserListCard: () => <div data-testid="users" /> }))
vi.mock('./users/InviteCard', () => ({ InviteCard: () => <div data-testid="invite" /> }))
vi.mock('./users/PreRegisterCard', () => ({ PreRegisterCard: () => <div data-testid="prereg" /> }))

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

  // 태스크 10 — 사용자 관리(admin/UserManagement.tsx)를 갈라 여기 붙였다.
  it('carries the user administration cards', () => {
    render(<SystemPanel />)
    expect(screen.getByTestId('users')).toBeInTheDocument()
    expect(screen.getByTestId('invite')).toBeInTheDocument()
    expect(screen.getByTestId('prereg')).toBeInTheDocument()
  })
})
