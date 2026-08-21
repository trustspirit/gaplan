import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUser, Task } from '@/types'

const mocks = vi.hoisted(() => ({
  deleteTask: vi.fn(),
  scheduleDelete: vi.fn((_id: string, doDelete: () => Promise<void>) => doDelete()),
}))

const expiredTask: Task = {
  id: 'task-expired',
  type: 'select_visit',
  assignedTo: 'president-1',
  seventyUid: 'seventy-1',
  regionId: 'region-1',
  dueDate: '2026-06-01',
  status: 'expired',
  createdBy: 'admin-1',
  createdAt: '2026-05-01',
  notifiedAt: [],
  availableDays: [0],
}

const interviewRespondedTask: Task = {
  id: 'task-interview',
  type: 'select_interview',
  assignedTo: 'president-1',
  seventyUid: 'seventy-1',
  regionId: 'region-1',
  dueDate: '2026-07-01',
  status: 'responded',
  createdBy: 'admin-1',
  createdAt: '2026-06-01',
  notifiedAt: [],
  availableDays: [],
  availableDateSlots: [
    { date: '2026-07-05', timeRanges: [{ startTime: '10:00', endTime: '12:00' }] },
  ],
  respondedSlots: [{ date: '2026-07-05', startTime: '10:00', endTime: '11:00' }],
}

let mockTasks: Task[] = [expiredTask]

const adminUser: AppUser = { uid: 'admin-1', role: 'admin', name: '관리자' } as AppUser
let currentUser: AppUser = adminUser

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

vi.mock('jotai', () => ({
  useSetAtom: () => vi.fn(),
  useAtomValue: () => currentUser,
  atom: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; defaultValue?: string }) =>
      params?.defaultValue ?? (params?.count != null ? `${key}:${params.count}` : key),
  }),
}))

vi.mock('@/hooks/useTasks', () => ({
  useAllTasks: () => ({ tasks: mockTasks, loading: false }),
}))

vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({
    users: [{ uid: 'president-1', name: '스테이크 회장', unitId: 'seoul-stake' }],
  }),
}))

vi.mock('@/hooks/useGeneralSchedules', () => ({
  useGeneralSchedules: () => ({ generalSchedules: [] }),
}))

vi.mock('@/hooks/useDeleteWithUndo', () => ({
  useDeleteWithUndo: () => ({
    pendingIds: new Set<string>(),
    scheduleDelete: mocks.scheduleDelete,
  }),
}))

vi.mock('@/services/taskService', () => ({
  deleteTask: mocks.deleteTask,
  expireTask: vi.fn(),
  updateTaskDetails: vi.fn(),
}))

vi.mock('@/services/scheduleService', () => ({
  adminConfirmSchedule: vi.fn(),
  adminConfirmWardVisit: vi.fn(),
}))

vi.mock('@/components/layout', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TopBar: () => null,
}))

vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <header>
      <h2>{title}</h2>
      {action}
    </header>
  ),
  CardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      loading?: boolean
      variant?: string
      size?: string
    },
  ) => {
    const { children, loading, variant, size, ...buttonProps } = props
    void loading
    void variant
    void size
    return <button {...buttonProps}>{children}</button>
  },
  Skeleton: () => <div>loading</div>,
  Input: (
    props: React.InputHTMLAttributes<HTMLInputElement> & {
      label?: string
      wrapperClassName?: string
    },
  ) => {
    const { label, wrapperClassName, ...inputProps } = props
    void wrapperClassName
    return (
      <label>
        {label}
        <input {...inputProps} />
      </label>
    )
  },
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyState: ({ title }: { title?: string }) => <p>{title}</p>,
  LoadingState: () => <div>loading</div>,
}))

vi.mock('@/components/domain/MultiDatePicker/MultiDatePicker', () => ({
  MultiDatePicker: () => <div />,
}))
vi.mock('@/components/domain/ResponseMatrix/ResponseMatrix', () => ({
  ResponseMatrix: () => <div />,
}))
vi.mock('@/components/domain/ScheduleSuggestions/ScheduleSuggestions', () => ({
  ScheduleSuggestions: () => <div />,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('./TaskCreationForm', () => ({
  TaskCreationForm: ({ onCreated }: { onCreated?: () => void }) => (
    <button type="button" data-testid="creation-form" onClick={() => onCreated?.()}>
      pretend to create
    </button>
  ),
}))

import { TaskPanel } from './TaskPanel'

function task(overrides: Partial<Task>): Task {
  return { ...expiredTask, ...overrides }
}

describe('TaskPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks = [expiredTask]
    currentUser = adminUser
    mocks.deleteTask.mockResolvedValue(undefined)
  })

  it('counts every status in the summary row', () => {
    mockTasks = [
      task({ id: '1', status: 'responded' }),
      task({ id: '2', status: 'pending' }),
      task({ id: '3', status: 'pending' }),
      task({ id: '4', status: 'completed' }),
      task({ id: '5', status: 'expired' }),
    ]
    render(<TaskPanel />)
    const summary = screen.getByTestId('task-summary')
    expect(within(summary).getByTestId('total-responded')).toHaveTextContent('1')
    expect(within(summary).getByTestId('total-pending')).toHaveTextContent('2')
    expect(within(summary).getByTestId('total-completed')).toHaveTextContent('1')
    expect(within(summary).getByTestId('total-expired')).toHaveTextContent('1')
  })

  it('shows an empty state when the role has no tasks at all', () => {
    mockTasks = []
    render(<TaskPanel />)
    expect(screen.getByText('taskProgress.emptyTasks')).toBeInTheDocument()
  })

  it('allows deleting an expired task', async () => {
    const user = userEvent.setup()
    render(<TaskPanel />)

    const deleteButton = await screen.findByRole('button', { name: 'common.delete' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mocks.scheduleDelete).toHaveBeenCalledWith(
        'task-expired',
        expect.any(Function),
        'common.deleted',
      )
      expect(mocks.deleteTask).toHaveBeenCalledWith('task-expired')
    })
  })

  it('interview 응답 task는 빈 확정 대기 row 섹션을 만들지 않는다', async () => {
    mockTasks = [interviewRespondedTask]

    render(<TaskPanel />)

    expect(await screen.findByText(/taskProgress\.responseStatus/)).toBeInTheDocument()
    expect(screen.queryByText('taskProgress.awaitingConfirm:1')).not.toBeInTheDocument()
  })

  it('keeps the creation form folded away until asked', () => {
    render(<TaskPanel />)
    const toggle = screen.getByRole('button', { name: 'plans.createTask' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('creation-form')).not.toBeInTheDocument()
  })

  it('opens the creation form and points the toggle at it', async () => {
    const user = userEvent.setup()
    render(<TaskPanel />)
    const toggle = screen.getByRole('button', { name: 'plans.createTask' })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const region = document.getElementById(toggle.getAttribute('aria-controls')!)
    expect(region).not.toBeNull()
    expect(within(region!).getByTestId('creation-form')).toBeInTheDocument()
  })

  it('folds the form back once a task is created', async () => {
    const user = userEvent.setup()
    render(<TaskPanel />)
    await user.click(screen.getByRole('button', { name: 'plans.createTask' }))
    await user.click(screen.getByTestId('creation-form'))
    expect(screen.queryByTestId('creation-form')).not.toBeInTheDocument()
  })
})

describe('TaskPanel for a seventy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks = [expiredTask]
    mocks.deleteTask.mockResolvedValue(undefined)
    currentUser = { uid: 'sv1', role: 'seventy', name: '칠십인' } as AppUser
  })

  it('offers no creation toggle — the seventy cannot make tasks', () => {
    render(<TaskPanel />)
    expect(screen.queryByRole('button', { name: 'plans.createTask' })).not.toBeInTheDocument()
  })
})
