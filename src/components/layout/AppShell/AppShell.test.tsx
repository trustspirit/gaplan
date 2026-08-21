import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider, createStore } from 'jotai'
import { AppShell } from './AppShell'
import { authUserAtom } from '@/store/authAtom'
import { ROLE } from '@/constants/roles'
import type { AppUser } from '@/types'

// AppShell mounts <Sidebar> twice (desktop + mobile; one is CSS-hidden, both
// stay in the DOM). If AppShell called usePendingTaskCount() once per Sidebar
// instead of lifting it, a president session would open two identical
// Firestore task subscriptions for a single badge.
//
// A plain `toHaveBeenCalledTimes(1)` on the underlying useTasks mock is not a
// reliable way to catch that: jotai's useAtomValue is built on
// useSyncExternalStore, which React re-invokes an extra time on mount to
// check for store tearing — so even the correct, single-call-site
// implementation calls the mock more than once. That is benign noise, not a
// duplicate subscription.
//
// Instead we make each successive useTasks call return a *different* task
// count. If AppShell calls the hook once and hands the same number to both
// Sidebar instances (correct), the desktop badge and the mobile badge must
// always agree, no matter which call in the sequence ends up in the
// committed render. If each Sidebar instead called the hook itself (the
// bug), the two instances consume two different, adjacent values from the
// sequence within the same render pass, and disagree.
const useTasksSpy = vi.hoisted(() =>
  vi.fn((): { tasks: Array<{ id: string; status: string }>; loading: boolean } => ({
    tasks: [],
    loading: false,
  })),
)
vi.mock('@/hooks/useTasks', () => ({ useTasks: useTasksSpy }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count != null ? `${key}:${params.count}` : key,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/services/authService', () => ({ signOut: vi.fn() }))

function makeUser(over: Partial<AppUser>): AppUser {
  return {
    uid: 'u1',
    email: 'a@b.com',
    name: '홍길동',
    role: ROLE.PRESIDENT,
    createdAt: '2026-01-01',
    ...over,
  }
}

function tasksOfLength(n: number) {
  // 배지는 아직 답하지 않은(pending) 것만 센다 — usePendingTaskCount 참고
  return {
    tasks: Array.from({ length: n }, (_, i) => ({ id: `t${n}-${i}`, status: 'pending' })),
    loading: false,
  }
}

function renderShell(user: AppUser) {
  const store = createStore()
  store.set(authUserAtom, user)
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/home']}>
        <AppShell role={user.role} name={user.name} topBar={<div />}>
          <div>content</div>
        </AppShell>
      </MemoryRouter>
    </Provider>,
  )
}

// 두 사이드바 모두 같은 링크 이름을 쓰므로, 랜드마크 이름으로 갈라서 읽는다.
function taskLinkIn(navLabel: string) {
  const nav = screen.getByRole('navigation', { name: navLabel })
  return within(nav).getByRole('link', { name: /nav.tasks/ })
}

// 데스크톱은 눈에 보이는 숫자 배지를 그린다
function readDesktopCount() {
  const badge = within(taskLinkIn('nav.primaryLabel')).queryByText(/^\d+$/)
  return badge ? Number(badge.textContent) : 0
}

// 모바일은 점만 그리고 개수는 스크린리더 문장으로만 알린다
function readMobileCount() {
  const match = taskLinkIn('nav.tabBarLabel').textContent?.match(/task\.pendingCount:(\d+)/)
  return match ? Number(match[1]) : 0
}

describe('AppShell', () => {
  beforeEach(() => {
    useTasksSpy.mockReset()
    // A long, strictly-increasing sequence of distinct values. Whichever call
    // in this sequence the committed render reflects, both Sidebar instances
    // must reflect the *same* one if the hook is only called once per render.
    for (let n = 1; n <= 12; n++) {
      useTasksSpy.mockReturnValueOnce(tasksOfLength(n))
    }
    useTasksSpy.mockReturnValue(tasksOfLength(99))
  })

  it('gives the desktop and mobile sidebars the same pending count', () => {
    renderShell(makeUser({ role: ROLE.PRESIDENT }))
    const desktopCount = readDesktopCount()
    const mobileCount = readMobileCount()
    expect(desktopCount).toBeGreaterThan(0)
    expect(mobileCount).toBe(desktopCount)
  })

  it('shows no badge anywhere when there are no pending tasks', () => {
    useTasksSpy.mockReset()
    useTasksSpy.mockReturnValue({ tasks: [], loading: false })
    const { container } = renderShell(makeUser({ role: ROLE.PRESIDENT }))
    const links = screen.getAllByRole('link', { name: /nav.tasks/ })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link).not.toHaveTextContent(/[0-9]/)
    expect(container.querySelectorAll('[data-tab-dot]')).toHaveLength(0)
  })
})
