import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import type { Task } from '@/types'
import { TaskCard } from './TaskCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

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

describe('TaskCard', () => {
  it('offers the plain action while the task is still pending', () => {
    render(<TaskCard task={task()} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'common.process' })).toBeInTheDocument()
    expect(screen.queryByText('common.waiting')).not.toBeInTheDocument()
  })

  it('marks an overdue task with a D+ badge', () => {
    render(<TaskCard task={task({ dueDate: NOW.subtract(2, 'day').format('YYYY-MM-DD') })} />)
    expect(screen.getByText('D+2')).toBeInTheDocument()
  })

  // 재열기 규칙 — 답을 낸 방문 Task만 다시 열 수 있다. 와드별 날짜는 확정 전까지
  // 고쳐 낼 수 있기 때문이다.
  describe('재열기 규칙', () => {
    it('lets a responded ward-visit task be reopened for editing', () => {
      render(
        <TaskCard task={task({ status: 'responded', type: 'select_visit' })} onAction={vi.fn()} />,
      )

      expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument()
      // 재열기가 되는 동안에는 「대기」 배지를 달지 않는다 — 배지와 버튼이 함께 뜨면
      // 손댈 수 없다는 뜻과 손댈 수 있다는 뜻이 한 카드에 같이 있게 된다.
      expect(screen.queryByText('common.waiting')).not.toBeInTheDocument()
    })

    it('passes the task back when the reopen action is pressed', async () => {
      const onAction = vi.fn()
      const responded = task({ id: 'v9', status: 'responded', type: 'select_visit' })
      render(<TaskCard task={responded} onAction={onAction} />)

      await userEvent.click(screen.getByRole('button', { name: 'common.edit' }))
      expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'v9' }))
    })

    // 한 번 잡힌 접견 시간은 고정이다 — 답한 뒤에는 다시 열지 않는다.
    it('locks a responded interview task behind a waiting badge', () => {
      render(
        <TaskCard
          task={task({ status: 'responded', type: 'select_interview' })}
          onAction={vi.fn()}
        />,
      )

      expect(screen.getByText('common.waiting')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    // 두 번째 가드 — 호출자가 onAction을 주지 않으면 규칙이 허락해도 버튼은 없다.
    it('draws no action at all when the caller withholds onAction', () => {
      render(<TaskCard task={task({ status: 'responded', type: 'select_visit' })} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('drops the D-day badge once the task is responded', () => {
      render(
        <TaskCard task={task({ status: 'responded', type: 'select_visit' })} onAction={vi.fn()} />,
      )
      expect(screen.queryByText(/^D[-+]/)).not.toBeInTheDocument()
      expect(screen.getByText('task.awaitingConfirmation')).toBeInTheDocument()
    })
  })
})
