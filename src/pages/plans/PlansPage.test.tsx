import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { AppUser } from '@/types'
import { ROLE } from '@/constants/roles'
import { PlansPage } from './PlansPage'

let currentUser: AppUser = { uid: 'a1', role: ROLE.ADMIN, name: '관리자' } as AppUser

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
vi.mock('./VisitPlanPanel', () => ({
  VisitPlanPanel: () => <div data-testid="panel-visit-plans" />,
}))
vi.mock('./ProjectPanel', () => ({ ProjectPanel: () => <div data-testid="panel-projects" /> }))
vi.mock('./tasks/TaskPanel', () => ({ TaskPanel: () => <div data-testid="panel-tasks" /> }))

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/plans/:tab" element={<PlansPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlansPage', () => {
  it('renders the panel the slug names', () => {
    renderAt('/plans/projects')
    expect(screen.getByTestId('panel-projects')).toBeInTheDocument()
    expect(screen.queryByTestId('panel-tasks')).not.toBeInTheDocument()
  })

  it('marks exactly one tab selected', () => {
    renderAt('/plans/tasks')
    const selected = screen
      .getAllByRole('tab')
      .filter((x) => x.getAttribute('aria-selected') === 'true')
    expect(selected.map((x) => x.textContent)).toEqual(['plans.tab.tasks'])
  })

  it('lands on the first tab when no slug is given', () => {
    renderAt('/plans')
    expect(screen.getByTestId('panel-visit-plans')).toBeInTheDocument()
  })

  it('lands on the first tab when the slug names nothing', () => {
    renderAt('/plans/not-a-tab')
    expect(screen.getByTestId('panel-visit-plans')).toBeInTheDocument()
  })

  // 칠십인이 /plans/projects 를 손으로 쳐 넣어도 프로젝트가 열리지 않는다.
  it('sends a seventy back to their own tab instead of a tab they cannot see', () => {
    currentUser = { uid: 'sv1', role: ROLE.SEVENTY, name: '칠십인' } as AppUser
    renderAt('/plans/projects')
    expect(screen.getByTestId('panel-tasks')).toBeInTheDocument()
    expect(screen.queryByTestId('panel-projects')).not.toBeInTheDocument()
  })

  // 판정 R34 — 항목이 하나인 탭리스트는 소음이다.
  it('draws no tablist for a role with a single tab', () => {
    currentUser = { uid: 'sv1', role: ROLE.SEVENTY, name: '칠십인' } as AppUser
    renderAt('/plans/tasks')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByTestId('panel-tasks')).toBeInTheDocument()
  })

  it('gives the admin all three tabs as links', () => {
    renderAt('/plans/tasks')
    expect(screen.getAllByRole('tab').map((x) => x.getAttribute('href'))).toEqual([
      '/plans/visit-plans',
      '/plans/tasks',
      '/plans/projects',
    ])
  })
})
