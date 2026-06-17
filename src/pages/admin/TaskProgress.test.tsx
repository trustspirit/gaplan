import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@/types'

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

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

vi.mock('jotai', () => ({
  useAtomValue: () => ({ uid: 'admin-1', role: 'admin', name: '관리자' }),
  atom: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number; defaultValue?: string }) =>
      params?.defaultValue ?? (params?.count != null ? `${key}:${params.count}` : key),
  }),
}))

vi.mock('@/hooks/useTasks', () => ({
  useAllTasks: () => ({ tasks: [expiredTask], loading: false }),
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
  useDeleteWithUndo: () => ({ pendingIds: new Set<string>(), scheduleDelete: mocks.scheduleDelete }),
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
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: string; size?: string }) => {
    const { children, loading, variant, size, ...buttonProps } = props
    void loading
    void variant
    void size
    return <button {...buttonProps}>{children}</button>
  },
  Skeleton: () => <div>loading</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; wrapperClassName?: string }) => {
    const { label, wrapperClassName, ...inputProps } = props
    void wrapperClassName
    return <label>{label}<input {...inputProps} /></label>
  },
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/domain', () => ({
  MultiDatePicker: () => <div />,
  ResponseMatrix: () => <div />,
  ScheduleSuggestions: () => <div />,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { TaskProgress } from './TaskProgress'

describe('TaskProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteTask.mockResolvedValue(undefined)
  })

  it('allows deleting an expired task', async () => {
    const user = userEvent.setup()
    render(<TaskProgress />)

    const deleteButton = await screen.findByRole('button', { name: 'common.delete' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mocks.scheduleDelete).toHaveBeenCalledWith('task-expired', expect.any(Function), 'common.deleted')
      expect(mocks.deleteTask).toHaveBeenCalledWith('task-expired')
    })
  })
})
