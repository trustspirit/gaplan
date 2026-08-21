import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MobileTabs } from './MobileTabs'
import { ROLE } from '@/constants/roles'
import { MAX_MOBILE_TABS } from '@/components/layout/navItems'
import type { UserRole } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  // MobileTabs imports BottomSheet from the '@/components/ui' barrel, which also
  // re-exports ErrorBoundary. ErrorBoundary imports the real '@/i18n' singleton,
  // which calls `i18n.use(initReactI18next)` at module load time. A react-i18next
  // mock that omits this export crashes on import, for a reason that has nothing
  // to do with the behaviour under test.
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

function renderTabs(role: UserRole = ROLE.ADMIN, pendingTaskCount?: number) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <MobileTabs role={role} pendingTaskCount={pendingTaskCount} />
    </MemoryRouter>,
  )
}

describe('MobileTabs', () => {
  it('never renders more than the tab budget', () => {
    renderTabs()
    // 닫힌 BottomSheet의 링크가 document에 남아 있으므로 nav 안으로 범위를 좁힌다
    const nav = within(screen.getByRole('navigation'))
    const tabs = nav.getAllByRole('link').length + nav.getAllByRole('button').length
    expect(tabs).toBeLessThanOrEqual(MAX_MOBILE_TABS)
  })

  it('puts the overflow items behind a more button', async () => {
    renderTabs()
    await userEvent.click(screen.getByRole('button', { name: /nav.more/ }))
    expect(screen.getByRole('link', { name: /nav.stats/ })).toBeInTheDocument()
  })

  it('renders no more button when every item fits', () => {
    renderTabs(ROLE.PRESIDENT)
    expect(screen.queryByRole('button', { name: /nav.more/ })).not.toBeInTheDocument()
  })

  // 알림은 숫자 배지가 아니라 점으로 — 탭 칸이 좁다
  it('marks a badged tab with a dot rather than a number', () => {
    const { container } = renderTabs(ROLE.PRESIDENT, 3)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).not.toHaveTextContent('3')
    expect(container.querySelector('[data-tab-dot]')).toBeInTheDocument()
  })

  it('shows no dot when there is nothing pending', () => {
    const { container } = renderTabs(ROLE.PRESIDENT, 0)
    expect(container.querySelector('[data-tab-dot]')).not.toBeInTheDocument()
  })

  // 점은 눈에만 보인다 — 스크린리더에는 별도로 알려야 한다
  it('announces the pending count to assistive tech, not just the dot', () => {
    renderTabs(ROLE.PRESIDENT, 3)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).toHaveAccessibleName(
      /task.pendingCount/,
    )
  })

  it('does not announce a pending count when there is nothing pending', () => {
    renderTabs(ROLE.PRESIDENT, 0)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).not.toHaveAccessibleName(
      /task.pendingCount/,
    )
  })
})
