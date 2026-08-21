import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppUser, VisitPlan } from '@/types'
import { createVisitPlan } from '@/services/visitPlanService'
import { VisitPlanPanel } from './VisitPlanPanel'

const ADMIN: AppUser = {
  uid: 'a1',
  role: 'admin',
  name: '관리자',
  email: 'a@b.com',
  createdAt: '2026-01-01',
} as AppUser

const SEVENTY: AppUser = {
  uid: 'sv1',
  role: 'seventy',
  name: '칠십인 하나',
  email: 's@b.com',
  createdAt: '2026-01-01',
} as AppUser

function plan(over: Partial<VisitPlan> = {}): VisitPlan {
  return {
    id: 'p1',
    title: '3월 방문',
    seventyUid: 'sv1',
    status: 'draft',
    items: [],
    createdBy: 'a1',
    createdAt: '2026-02-01',
    ...over,
  } as VisitPlan
}

let plans: VisitPlan[] = []
let loading = false
const navigateMock = vi.fn()

beforeEach(() => {
  plans = []
  loading = false
  navigateMock.mockClear()
  vi.mocked(createVisitPlan).mockClear()
  vi.mocked(createVisitPlan).mockResolvedValue('new-plan')
})

vi.mock('jotai', () => ({
  useAtomValue: () => ADMIN,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
// 배럴(@/components/ui)이 무엇을 더 끌고 오든 깨지지 않도록 실제 모듈 위에
// 두 훅만 덮는다. 통째로 대체하면 배럴이 쓰는 export가 사라져 렌더가 터진다.
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: null }),
}))
vi.mock('@/hooks/useVisitPlans', () => ({
  useVisitPlans: () => ({ plans, loading }),
}))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: [ADMIN, SEVENTY] }),
}))
vi.mock('@/services/visitPlanService', () => ({
  createVisitPlan: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('VisitPlanPanel', () => {
  it('shows a skeleton while the plans load', () => {
    loading = true
    render(<VisitPlanPanel />)
    expect(screen.getByRole('status', { name: 'common.loading' })).toBeInTheDocument()
  })

  it('shows an empty state when there are no plans', () => {
    render(<VisitPlanPanel />)
    expect(screen.getByText('visitPlan.empty')).toBeInTheDocument()
  })

  it('lists a plan with its seventy and item count', () => {
    plans = [plan({ items: [{}, {}] as VisitPlan['items'] })]
    render(<VisitPlanPanel />)
    const title = screen.getByText('3월 방문')
    expect(title).toBeInTheDocument()
    // 새 계획 폼의 <select>도 같은 이름의 <option>을 담고 있어 문서 전체를
    // 뒤지면 걸린다 — 방금 그려진 계획 행으로 범위를 좁혀서 구분한다.
    const row = title.closest('button')!
    expect(within(row).getByText(/칠십인 하나/)).toBeInTheDocument()
    expect(within(row).getByText(/· 2 ·/)).toBeInTheDocument()
  })

  // 경로 문자열이 화면에 리터럴로 남아 있지 않다는 것을 여기서 고정한다 —
  // 계획 3이 세운 규칙이고, 옛 화면은 이걸 어기고 있었다.
  it('opens a plan at its new path', async () => {
    plans = [plan({ id: 'p9' })]
    render(<VisitPlanPanel />)
    await userEvent.click(screen.getByText('3월 방문'))
    expect(navigateMock).toHaveBeenCalledWith('/plans/visit-plans/p9')
  })

  it('keeps the create button disabled until a title and a seventy are chosen', async () => {
    render(<VisitPlanPanel />)
    const button = screen.getByRole('button', { name: 'visitPlan.create' })
    expect(button).toBeDisabled()

    await userEvent.type(screen.getByLabelText('visitPlan.planTitle'), '4월 방문')
    expect(button).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('visitPlan.seventy'), 'sv1')
    expect(button).toBeEnabled()
  })

  it('lands on the plan it just created', async () => {
    render(<VisitPlanPanel />)
    await userEvent.type(screen.getByLabelText('visitPlan.planTitle'), '4월 방문')
    await userEvent.selectOptions(screen.getByLabelText('visitPlan.seventy'), 'sv1')
    await userEvent.click(screen.getByRole('button', { name: 'visitPlan.create' }))

    expect(createVisitPlan).toHaveBeenCalledWith('4월 방문', 'sv1', 'a1')
    expect(navigateMock).toHaveBeenCalledWith('/plans/visit-plans/new-plan')
  })
})
