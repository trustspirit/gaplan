import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Task } from '@/types'
import { expireTask } from '@/services/taskService'
import { TaskRow } from './TaskRow'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/services/taskService', () => ({ expireTask: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/services/scheduleService', () => ({
  adminConfirmSchedule: vi.fn(),
  adminConfirmWardVisit: vi.fn(),
}))
vi.mock('./EditTaskModal', () => ({ EditTaskModal: () => <div data-testid="edit-task-modal" /> }))
vi.mock('./TaskDetailModal', () => ({ TaskDetailModal: () => <div data-testid="task-detail-modal" /> }))

const TASK: Task = {
  id: 't1',
  title: '11월 접견',
  type: 'select_interview',
  assignedTo: 'p1',
  seventyUid: 'sv1',
  regionId: 'seoul',
  status: 'pending',
  dueDate: '2999-12-31',
  createdBy: 'a1',
  createdAt: '2026-11-01',
  notifiedAt: [],
  availableDays: [],
}

// 만료는 되돌릴 수 없고(회장이 더 이상 응답하지 못한다), 수정 버튼 바로 옆의 작은 아이콘이다.
// 한 번 누르면 바로 만료되던 것을 먼저 묻게 했다.
describe('TaskRow 만료 확인', () => {
  beforeEach(() => {
    vi.mocked(expireTask).mockClear()
  })

  it('만료 버튼을 누르면 바로 만료하지 않고 먼저 묻는다', async () => {
    render(<TaskRow task={TASK} presidentName="회장 하나" unitName="서울 스테이크" />)
    await userEvent.click(screen.getByRole('button', { name: 'taskProgress.expire' }))
    expect(screen.getByRole('dialog', { name: 'task.expireConfirmTitle' })).toBeInTheDocument()
    expect(expireTask).not.toHaveBeenCalled()
  })

  it('취소하면 만료하지 않는다', async () => {
    render(<TaskRow task={TASK} presidentName="회장 하나" unitName="서울 스테이크" />)
    await userEvent.click(screen.getByRole('button', { name: 'taskProgress.expire' }))
    const dialog = within(screen.getByRole('dialog', { name: 'task.expireConfirmTitle' }))
    await userEvent.click(dialog.getByRole('button', { name: 'common.cancel' }))
    expect(expireTask).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'task.expireConfirmTitle' })).toBeNull()
  })

  it('확인하면 만료한다', async () => {
    render(<TaskRow task={TASK} presidentName="회장 하나" unitName="서울 스테이크" />)
    await userEvent.click(screen.getByRole('button', { name: 'taskProgress.expire' }))
    const dialog = within(screen.getByRole('dialog', { name: 'task.expireConfirmTitle' }))
    await userEvent.click(dialog.getByRole('button', { name: 'task.expire' }))
    await waitFor(() => expect(expireTask).toHaveBeenCalledWith('t1'))
  })
})
