import type { Task } from '@/types'
import { splitHomeTasks } from './homeTasks'

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'select_interview',
    assignedTo: 'p1',
    seventyUid: 'sv1',
    regionId: 'seoul',
    dueDate: '2026-03-01',
    createdBy: 'a1',
    status: 'pending',
    availableDays: [],
    ...over,
  } as Task
}

describe('splitHomeTasks', () => {
  it('has no primary when there is nothing to do', () => {
    expect(splitHomeTasks([])).toEqual({ primary: null, rest: [] })
  })

  // 판정 R39 — 마감이 가장 이른 것이 주 카드다. 회장이 이미 D-day 배지로
  // 보고 있는 값이라, 왜 이게 먼저인지 화면이 스스로 설명한다.
  it('promotes the pending task with the earliest due date', () => {
    const result = splitHomeTasks([
      task({ id: 'later', dueDate: '2026-03-10' }),
      task({ id: 'soonest', dueDate: '2026-03-02' }),
      task({ id: 'middle', dueDate: '2026-03-05' }),
    ])
    expect(result.primary?.id).toBe('soonest')
    expect(result.rest.map((x) => x.id)).toEqual(['middle', 'later'])
  })

  // 구독 순서가 주 카드를 정하면 같은 화면을 두 번 열 때 다른 것이 올라온다.
  it('breaks a due-date tie by id so the choice is stable', () => {
    const a = splitHomeTasks([task({ id: 'b' }), task({ id: 'a' })])
    const b = splitHomeTasks([task({ id: 'a' }), task({ id: 'b' })])
    expect(a.primary?.id).toBe('a')
    expect(b.primary?.id).toBe('a')
  })

  // 판정 R40 — responded는 회장이 할 일을 끝내고 남의 확정을 기다리는 상태다.
  it('never promotes a responded task, even when it is the most urgent', () => {
    const result = splitHomeTasks([
      task({ id: 'waiting', status: 'responded', dueDate: '2026-01-01' }),
      task({ id: 'todo', status: 'pending', dueDate: '2026-12-31' }),
    ])
    expect(result.primary?.id).toBe('todo')
    expect(result.rest.map((x) => x.id)).toEqual(['waiting'])
  })

  it('keeps responded tasks visible in rest when nothing is pending', () => {
    const result = splitHomeTasks([task({ id: 'waiting', status: 'responded' })])
    expect(result.primary).toBeNull()
    expect(result.rest.map((x) => x.id)).toEqual(['waiting'])
  })

  // rest는 pending을 먼저, responded를 뒤에 둔다 — 접힘을 펼쳤을 때
  // 할 수 있는 일이 위에 온다.
  it('orders rest with pending before responded', () => {
    const result = splitHomeTasks([
      task({ id: 'waiting', status: 'responded', dueDate: '2026-01-01' }),
      task({ id: 'first', status: 'pending', dueDate: '2026-02-01' }),
      task({ id: 'second', status: 'pending', dueDate: '2026-03-01' }),
    ])
    expect(result.primary?.id).toBe('first')
    expect(result.rest.map((x) => x.id)).toEqual(['second', 'waiting'])
  })

  it('leaves the caller array untouched', () => {
    const input = [task({ id: 'b', dueDate: '2026-03-10' }), task({ id: 'a' })]
    splitHomeTasks(input)
    expect(input.map((x) => x.id)).toEqual(['b', 'a'])
  })
})
