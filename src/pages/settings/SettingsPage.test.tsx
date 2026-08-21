import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { AppUser } from '@/types'
import { ROLE } from '@/constants/roles'
import { useTopBar } from '@/hooks/useTopBar'
import { SettingsPage } from './SettingsPage'

let currentUser: AppUser

beforeEach(() => {
  currentUser = { uid: 'a1', role: ROLE.ADMIN, name: '관리자' } as AppUser
})

vi.mock('jotai', () => ({
  useAtomValue: () => currentUser,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
vi.mock('./SystemPanel', () => ({ SystemPanel: () => <div data-testid="panel-system" /> }))
vi.mock('./SharingPanel', () => ({ SharingPanel: () => <div data-testid="panel-sharing" /> }))
vi.mock('./AccountPanel', () => ({ AccountPanel: () => <div data-testid="panel-account" /> }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('shows the screen the slug names', () => {
    renderAt('/settings/sharing')
    expect(screen.getByTestId('panel-sharing')).toBeInTheDocument()
  })

  it('sends a bare /settings to the first screen this role can see', () => {
    renderAt('/settings')
    expect(screen.getByTestId('panel-system')).toBeInTheDocument()
  })

  // 집행서기는 시스템이 없다 — 자기 첫 화면인 공유로 간다.
  it('sends an exec secretary to sharing instead of system', () => {
    currentUser = { uid: 'e1', role: ROLE.EXEC_SECRETARY, name: '집행서기' } as AppUser
    renderAt('/settings')
    expect(screen.getByTestId('panel-sharing')).toBeInTheDocument()
  })

  it('sends a role to its own first screen when it asks for one it cannot see', () => {
    currentUser = { uid: 'p1', role: ROLE.PRESIDENT, name: '회장' } as AppUser
    renderAt('/settings/system')
    expect(screen.getByTestId('panel-account')).toBeInTheDocument()
  })

  it('sends a typo to the first screen too', () => {
    renderAt('/settings/nope')
    expect(screen.getByTestId('panel-system')).toBeInTheDocument()
  })

  // 판정 R34(계획 4) — 보이는 화면이 하나뿐이면 내비를 그리지 않는다.
  it('draws no sub navigation for a role with a single screen', () => {
    currentUser = { uid: 'p1', role: ROLE.PRESIDENT, name: '회장' } as AppUser
    renderAt('/settings/account')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'settings.navLabel' })).not.toBeInTheDocument()
  })

  it('draws the sub navigation for a role with several', () => {
    renderAt('/settings/system')
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(1)
  })

  it('refuses a role that has no settings at all', () => {
    currentUser = { uid: 'x1', role: ROLE.PENDING, name: '대기' } as AppUser
    renderAt('/settings')
    expect(screen.getByText('state.forbiddenTitle')).toBeInTheDocument()
  })

  // 태스크 10 fix round 1 — pageHelp.users가 시스템 탭에서 살아있는지 고정한다.
  // PlansPage.tsx의 HELP_KEY와 같은 패턴.
  it('carries the help key that used to live on the standalone user-management page', () => {
    renderAt('/settings/system')
    expect(vi.mocked(useTopBar)).toHaveBeenLastCalledWith(
      expect.objectContaining({ helpInfoKey: 'pageHelp.users' }),
    )
  })

  it('has no help key for tabs that never had one', () => {
    renderAt('/settings/sharing')
    expect(vi.mocked(useTopBar)).toHaveBeenLastCalledWith(
      expect.objectContaining({ helpInfoKey: undefined }),
    )
  })

  // FIX 7 (최종 리뷰) — 세 하위 화면 전부 'settings.title' 하나만 보여줬다. 로케일에
  // 이미 있던 각 화면 title 키가 이제야 쓰인다.
  it('names each sub-screen with its own title', () => {
    renderAt('/settings/system')
    expect(screen.getByText('settings.system.title')).toBeInTheDocument()

    renderAt('/settings/sharing')
    expect(screen.getByText('settings.sharing.title')).toBeInTheDocument()

    currentUser = { uid: 'p1', role: ROLE.PRESIDENT, name: '회장' } as AppUser
    renderAt('/settings/account')
    expect(screen.getByText('settings.account.title')).toBeInTheDocument()
  })
})
