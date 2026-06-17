import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VisitPlan } from '@/types'

const mocks = vi.hoisted(() => ({
  updateVisitPlanItems: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ planId: 'plan-1' }),
  useNavigate: () => vi.fn(),
}))

vi.mock('jotai', () => ({
  useAtomValue: () => ({ uid: 'admin-1', role: 'admin', name: '관리자' }),
  atom: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count != null ? `${key}:${params.count}` : key,
  }),
}))

vi.mock('@/services/visitPlanService', () => ({
  getVisitPlan: vi.fn(async (): Promise<VisitPlan> => ({
    id: 'plan-1',
    title: '테스트 계획',
    seventyUid: 'sev-1',
    status: 'draft',
    items: [{ itemId: 'item-1', unitId: 'seoul-stake', wardName: '녹번 와드', date: '2026-07-05', startTime: '10:00', endTime: '13:00' }],
    createdBy: 'admin-1',
    createdAt: '2026-06-01',
    projectId: 'project-1',
  })),
  updateVisitPlanItems: mocks.updateVisitPlanItems,
  deleteVisitPlan: vi.fn(),
  publishVisitPlan: vi.fn(),
  updateVisitPlanProject: vi.fn(),
}))

vi.mock('@/services/scheduleService', () => ({ deleteScheduleViaCF: vi.fn() }))
vi.mock('@/hooks/useDeleteWithUndo', () => ({
  useDeleteWithUndo: () => ({ pendingIds: new Set<string>(), scheduleDelete: vi.fn() }),
}))
vi.mock('@/hooks/useVisitPlanContext', () => ({
  useVisitPlanContext: () => ({
    loading: false,
    staleWards: [],
    lastVisitByWard: new Map(),
    balance: [],
    generalSchedules: [],
  }),
}))
vi.mock('@/components/layout', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TopBar: () => null,
}))
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ title }: { title: string }) => <h3>{title}</h3>,
  CardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: string; size?: string }) => {
    const { children, loading, variant, size, ...buttonProps } = props
    void loading
    void variant
    void size
    return <button {...buttonProps}>{children}</button>
  },
  Spinner: () => <div>loading</div>,
  DeleteConfirmSheet: () => null,
}))
vi.mock('@/components/domain', () => ({
  AddVisitPanel: () => <div>add visit</div>,
  PlanItemList: () => <div>items</div>,
  BalancePanel: () => <div>balance</div>,
  ProjectPicker: () => <div data-testid="project-picker" />,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { VisitPlanBoardPage } from './VisitPlanBoardPage'

describe('VisitPlanBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('보드에서 프로젝트 연결 선택기를 유지한다', async () => {
    render(<VisitPlanBoardPage />)

    await screen.findByText('테스트 계획')

    expect(screen.getByTestId('project-picker')).toBeInTheDocument()
  })

  it('저장 버튼으로 현재 계획 항목을 저장할 수 있다', async () => {
    const user = userEvent.setup()
    render(<VisitPlanBoardPage />)

    const save = await screen.findByRole('button', { name: 'common.save' })
    await user.click(save)

    await waitFor(() => {
      expect(mocks.updateVisitPlanItems).toHaveBeenCalledWith('plan-1', [
        expect.objectContaining({ itemId: 'item-1', wardName: '녹번 와드' }),
      ])
    })
  })
})
