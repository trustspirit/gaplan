import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { MobileTabs } from './MobileTabs'
import styles from './MobileTabs.module.scss'
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

function renderTabs(role: UserRole = ROLE.ADMIN, pendingTaskCount?: number, path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabs role={role} pendingTaskCount={pendingTaskCount} />
    </MemoryRouter>,
  )
}

/** 탭바 안에서 활성으로 표시된 항목들의 라벨 */
function activeTabLabels() {
  const nav = screen.getByRole('navigation')
  return Array.from(nav.querySelectorAll(`.${styles.active}`), (el) => el.textContent)
}

describe('MobileTabs', () => {
  // 닫힌 BottomSheet도 포털로 document.body에 남아 있고, dom-accessibility-api는
  // inert를 무시한다 — 오버플로 링크가 조회된다는 사실만으로는 시트가 열렸는지 알 수
  // 없다(클릭을 지워도 통과한다). jsdom에서 열림/닫힘을 실제로 구분해 주는 것은
  // 오버레이의 inert 속성뿐이므로 그것을 기준으로 삼는다.
  const overlay = () => screen.getByRole('dialog').parentElement!

  it('never renders more than the tab budget', () => {
    renderTabs()
    // 닫힌 BottomSheet의 링크가 document에 남아 있으므로 nav 안으로 범위를 좁힌다
    const nav = within(screen.getByRole('navigation'))
    const tabs = nav.getAllByRole('link').length + nav.getAllByRole('button').length
    expect(tabs).toBeLessThanOrEqual(MAX_MOBILE_TABS)
  })

  it('puts the overflow items behind a more button', async () => {
    renderTabs()
    expect(overlay()).toHaveAttribute('inert')
    await userEvent.click(screen.getByRole('button', { name: /nav.more/ }))
    expect(overlay()).not.toHaveAttribute('inert')
    expect(within(overlay()).getByRole('link', { name: /nav.stats/ })).toBeInTheDocument()
  })

  it('closes the sheet once an overflow item is chosen', async () => {
    renderTabs()
    await userEvent.click(screen.getByRole('button', { name: /nav.more/ }))
    await userEvent.click(within(overlay()).getByRole('link', { name: /nav.stats/ }))
    expect(overlay()).toHaveAttribute('inert')
  })

  // /admin/task-progress 는 taskProgress 탭의 경로이면서 동시에 오버플로에 들어간
  // admin(to: '/admin')의 자식 경로다. 두 곳이 같이 켜지면 지금 어디인지 알 수 없다.
  it('marks exactly one tab as current on a child route of an overflow item', () => {
    renderTabs(ROLE.ADMIN, undefined, '/admin/task-progress')
    expect(activeTabLabels()).toEqual(['nav.taskProgress'])
  })

  it('renders no more button when every item fits', () => {
    renderTabs(ROLE.PRESIDENT)
    expect(screen.queryByRole('button', { name: /nav.more/ })).not.toBeInTheDocument()
  })

  // 셸은 데스크톱에서도 MobileTabs를 마운트해 둔다. 오버플로가 없는 역할에서까지
  // 시트를 그리면 position:fixed 오버레이가 매 세션 document.body에 남는다.
  it('mounts no overflow sheet at all when every item fits', () => {
    renderTabs(ROLE.PRESIDENT)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

  // 스펙 §3의 금지 규칙은 데스크톱 사이드바만이 아니라 탭바에도 걸린다 —
  // 활성 탭 위/앞의 색 막대도 같은 패턴이다.
  it('never marks the active tab with an accent bar', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'MobileTabs.module.scss'), 'utf8'))
  })

  it('does not announce a pending count when there is nothing pending', () => {
    renderTabs(ROLE.PRESIDENT, 0)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).not.toHaveAccessibleName(
      /task.pendingCount/,
    )
  })
})
