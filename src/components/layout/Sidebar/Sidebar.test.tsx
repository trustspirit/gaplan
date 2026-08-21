import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ROLE } from '@/constants/roles'

// This file pins the AppShell -> Sidebar -> {SidebarNav,MobileTabs} half of the
// badge wiring: Sidebar itself no longer owns the subscription (AppShell does,
// see AppShell.test.tsx) — it must simply forward whatever `pendingTaskCount`
// it is given to both of its children. SidebarNav.test.tsx / MobileTabs.test.tsx
// already pin the prop -> rendered badge half.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/services/authService', () => ({ signOut: vi.fn() }))

function renderSidebar(pendingTaskCount: number | undefined, mobile: boolean) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar
        role={ROLE.PRESIDENT}
        name="홍길동"
        mobile={mobile}
        pendingTaskCount={pendingTaskCount}
      />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('forwards a nonzero pendingTaskCount to the desktop nav badge', () => {
    renderSidebar(3, false)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).toHaveTextContent('3')
  })

  it('forwards a zero pendingTaskCount to the desktop nav (no badge)', () => {
    renderSidebar(0, false)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).not.toHaveTextContent(/[0-9]/)
  })

  it('forwards a nonzero pendingTaskCount to the mobile tabs', () => {
    const { container } = renderSidebar(3, true)
    expect(container.querySelector('[data-tab-dot]')).toBeInTheDocument()
  })

  it('forwards a zero pendingTaskCount to the mobile tabs (no dot)', () => {
    const { container } = renderSidebar(0, true)
    expect(container.querySelector('[data-tab-dot]')).not.toBeInTheDocument()
  })
})
