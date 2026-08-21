import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ForbiddenPage } from './ForbiddenPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

describe('ForbiddenPage', () => {
  it('explains that access is denied', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('state.forbiddenTitle')).toBeInTheDocument()
    expect(screen.getByText('state.forbiddenDescription')).toBeInTheDocument()
  })

  it('offers a way back to the dashboard', () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'state.goHome' })).toHaveAttribute('href', '/home')
  })
})
