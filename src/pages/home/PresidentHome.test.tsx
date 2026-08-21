import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import type { AppUser, Schedule, Task } from '@/types'
import { PresidentHome } from './PresidentHome'

const PRESIDENT = {
  uid: 'p1',
  role: 'president',
  name: '회장',
  unitId: 'u1',
} as AppUser

const NOW = dayjs()

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'select_interview',
    assignedTo: 'p1',
    seventyUid: 'sv1',
    regionId: 'seoul',
    dueDate: NOW.add(7, 'day').format('YYYY-MM-DD'),
    createdBy: 'a1',
    status: 'pending',
    availableDays: [],
    ...over,
  } as Task
}

let tasks: Task[] = []
let schedules: Schedule[] = []
let tasksLoading = false
const openTask = vi.fn()

beforeEach(() => {
  tasks = []
  schedules = []
  tasksLoading = false
  openTask.mockClear()
})

vi.mock('jotai', () => ({
  useAtomValue: () => PRESIDENT,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
// ResponsiveDialog reaches into useIsMobile, which calls window.matchMedia —
// jsdom doesn't implement it. Repo convention (TopBar.test.tsx, LeadersPage.test.tsx)
// is to mock the hook directly rather than polyfill matchMedia.
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks, loading: tasksLoading }) }))
vi.mock('@/hooks/useSchedules', () => ({
  useSchedules: () => ({ schedules, loading: false }),
}))
vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => ({ getUnitName: (id: string) => id, getWardName: (id: string) => id }),
}))
vi.mock('@/hooks/useTaskConfirm', () => ({
  useTaskConfirm: () => ({
    activeTask: null,
    selectedSlots: [],
    toggleSlot: vi.fn(),
    isSlotSelected: () => false,
    submitting: false,
    availableSlots: [],
    openTask,
    closeTask: vi.fn(),
    handleSubmitAvailability: vi.fn(),
  }),
}))
vi.mock('@/hooks/useWardSubmit', () => ({
  useWardSubmit: () => ({ handleSubmitWards: vi.fn(), wardSubmitting: false }),
}))
// 이 테스트의 관심사는 주 카드와 접힘이다. 일정 카드까지 진짜로 렌더하면
// ScheduleItem의 의존성이 통째로 딸려 오고, 그건 SeventyHome 테스트가 본다.
vi.mock('./ScheduleListCard', () => ({
  ScheduleListCard: () => <div data-testid="upcoming" />,
}))

describe('PresidentHome', () => {
  it('shows a skeleton while the tasks load', () => {
    tasksLoading = true
    render(<PresidentHome />)
    expect(screen.getByRole('status', { name: 'common.loading' })).toBeInTheDocument()
  })

  it('shows an all-clear state when nothing is pending', () => {
    render(<PresidentHome />)
    expect(screen.getByText('home.allClear')).toBeInTheDocument()
  })

  // 판정 R38 — 하나만 크게, 나머지는 접어 둔다.
  it('puts only the most urgent task in the primary card', () => {
    tasks = [
      task({ id: 'later', dueDate: NOW.add(20, 'day').format('YYYY-MM-DD') }),
      task({ id: 'soonest', dueDate: NOW.add(2, 'day').format('YYYY-MM-DD'), title: '급한 접견' }),
    ]
    render(<PresidentHome />)
    const primary = screen.getByTestId('primary-task')
    expect(within(primary).getByText('급한 접견')).toBeInTheDocument()
  })

  it('folds the remaining tasks away behind a count', () => {
    tasks = [
      task({ id: 'a', dueDate: NOW.add(2, 'day').format('YYYY-MM-DD') }),
      task({ id: 'b', dueDate: NOW.add(5, 'day').format('YYYY-MM-DD') }),
      task({ id: 'c', dueDate: NOW.add(9, 'day').format('YYYY-MM-DD') }),
    ]
    render(<PresidentHome />)
    const toggle = screen.getByRole('button', { name: 'home.moreTasks' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    // 접혀 있는 동안 나머지 Task의 액션 버튼이 도달 가능하면 안 된다.
    expect(screen.getAllByRole('button', { name: 'common.process' })).toHaveLength(1)
  })

  it('reveals the rest when the count is pressed', async () => {
    tasks = [
      task({ id: 'a', dueDate: NOW.add(2, 'day').format('YYYY-MM-DD') }),
      task({ id: 'b', dueDate: NOW.add(5, 'day').format('YYYY-MM-DD') }),
    ]
    render(<PresidentHome />)
    const toggle = screen.getByRole('button', { name: 'home.moreTasks' })
    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const region = document.getElementById(toggle.getAttribute('aria-controls')!)
    expect(region).not.toBeNull()
    expect(within(region!).getAllByRole('button', { name: 'common.process' })).toHaveLength(1)
  })

  it('draws no fold at all when there is only one task', () => {
    tasks = [task({ id: 'only' })]
    render(<PresidentHome />)
    expect(screen.queryByRole('button', { name: 'home.moreTasks' })).not.toBeInTheDocument()
  })

  // 판정 R40 — 답을 낸 Task는 큰 카드로 올라오지 않는다.
  it('keeps a responded task out of the primary card', () => {
    tasks = [
      task({ id: 'waiting', status: 'responded', dueDate: NOW.format('YYYY-MM-DD') }),
      task({ id: 'todo', dueDate: NOW.add(30, 'day').format('YYYY-MM-DD'), title: '할 일' }),
    ]
    render(<PresidentHome />)
    expect(within(screen.getByTestId('primary-task')).getByText('할 일')).toBeInTheDocument()
  })

  it('shows the all-clear state when only responded tasks remain', () => {
    tasks = [task({ id: 'waiting', status: 'responded' })]
    render(<PresidentHome />)
    expect(screen.getByText('home.allClear')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'home.moreTasks' })).toBeInTheDocument()
  })

  // 재열기 규칙의 바깥 가드. TaskCard가 스스로도 막지만(TaskCard.test.tsx),
  // 접힘 목록은 pending과 responded를 한데 담으므로 호출자 쪽 조건이 따로 산다.
  describe('접힘 목록의 재열기 규칙', () => {
    async function openFold(rest: Task[]) {
      tasks = [task({ id: 'primary', dueDate: NOW.format('YYYY-MM-DD') }), ...rest]
      render(<PresidentHome />)
      const toggle = screen.getByRole('button', { name: 'home.moreTasks' })
      await userEvent.click(toggle)
      return within(document.getElementById(toggle.getAttribute('aria-controls')!)!)
    }

    it('hands a responded ward-visit task back to the picker', async () => {
      const fold = await openFold([
        task({ id: 'visit', status: 'responded', type: 'select_visit' }),
      ])

      await userEvent.click(fold.getByRole('button', { name: 'common.edit' }))
      expect(openTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'visit' }))
    })

    it('leaves a responded interview task with no way back in', async () => {
      const fold = await openFold([
        task({ id: 'interview', status: 'responded', type: 'select_interview' }),
      ])

      expect(fold.getByText('common.waiting')).toBeInTheDocument()
      expect(fold.queryByRole('button')).not.toBeInTheDocument()
    })

    it('still opens a pending interview task from the fold', async () => {
      const fold = await openFold([
        task({ id: 'todo', dueDate: NOW.add(3, 'day').format('YYYY-MM-DD') }),
      ])

      await userEvent.click(fold.getByRole('button', { name: 'common.process' }))
      expect(openTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'todo' }))
    })
  })

  it('opens the picker from the primary card', async () => {
    tasks = [task({ id: 'only' })]
    render(<PresidentHome />)
    await userEvent.click(within(screen.getByTestId('primary-task')).getByRole('button'))
    expect(openTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'only' }))
  })
})
