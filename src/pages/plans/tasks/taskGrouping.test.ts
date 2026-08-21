import { REGIONS } from '@/constants/regions'
import type { Task } from '@/types'
import {
  countByStatus,
  groupTasksByRegion,
  orderedRegionIds,
  interviewBatches,
} from './taskGrouping'

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    type: 'select_interview',
    assignedTo: 'p1',
    seventyUid: 'sv1',
    regionId: REGIONS[0].id,
    dueDate: '2026-03-01',
    createdBy: 'a1',
    status: 'pending',
    availableDays: [],
    ...over,
  } as Task
}

describe('countByStatus', () => {
  it('counts each status separately', () => {
    expect(
      countByStatus([
        task({ id: '1', status: 'responded' }),
        task({ id: '2', status: 'responded' }),
        task({ id: '3', status: 'pending' }),
        task({ id: '4', status: 'completed' }),
        task({ id: '5', status: 'expired' }),
      ]),
    ).toEqual({ responded: 2, pending: 1, completed: 1, expired: 1 })
  })

  it('counts an empty list as all zeroes', () => {
    expect(countByStatus([])).toEqual({ responded: 0, pending: 0, completed: 0, expired: 0 })
  })
})

describe('groupTasksByRegion', () => {
  it('puts each task under its region', () => {
    const a = REGIONS[0].id
    const b = REGIONS[1].id
    const grouped = groupTasksByRegion([
      task({ id: '1', regionId: a }),
      task({ id: '2', regionId: b }),
      task({ id: '3', regionId: a }),
    ])
    expect(grouped[a].map((x) => x.id)).toEqual(['1', '3'])
    expect(grouped[b].map((x) => x.id)).toEqual(['2'])
  })

  // regionId가 빈 문자열인 Task가 실제로 있다 — TaskCreation이 회장의 unitId로
  // 지역을 찾지 못하면 ''를 넣는다. 그 Task가 조용히 사라지면 안 된다.
  it('collects region-less tasks under a known key instead of dropping them', () => {
    const grouped = groupTasksByRegion([task({ id: '1', regionId: '' })])
    expect(grouped.unknown.map((x) => x.id)).toEqual(['1'])
  })
})

describe('orderedRegionIds', () => {
  it('follows the REGIONS order, not insertion order', () => {
    const a = REGIONS[0].id
    const b = REGIONS[1].id
    expect(orderedRegionIds({ [b]: [task()], [a]: [task()] })).toEqual([a, b])
  })

  it('puts anything REGIONS does not know at the end', () => {
    const a = REGIONS[0].id
    expect(orderedRegionIds({ unknown: [task()], [a]: [task()] })).toEqual([a, 'unknown'])
  })

  it('skips regions with no tasks', () => {
    const a = REGIONS[0].id
    expect(orderedRegionIds({ [a]: [task()] })).toEqual([a])
  })
})

describe('interviewBatches', () => {
  it('groups interview tasks by batchId', () => {
    const batches = interviewBatches([
      task({ id: '1', batchId: 'b1', status: 'responded' }),
      task({ id: '2', batchId: 'b1', status: 'pending' }),
      task({ id: '3', batchId: 'b2', status: 'completed' }),
    ])
    expect(batches.map((b) => b.map((x) => x.id))).toEqual([['1', '2'], ['3']])
  })

  // 아무도 응답하지 않은 배치에 매트릭스를 그리면 빈 격자만 남는다.
  it('drops a batch nobody has answered yet', () => {
    expect(interviewBatches([task({ id: '1', batchId: 'b1', status: 'pending' })])).toEqual([])
  })

  it('ignores visit tasks — they have no time grid', () => {
    expect(
      interviewBatches([task({ id: '1', type: 'select_visit', status: 'responded' })]),
    ).toEqual([])
  })

  // batchId 없이 만들어진 옛 Task는 자기 혼자 한 배치다.
  it('treats a batch-less interview task as its own batch', () => {
    const batches = interviewBatches([task({ id: '1', status: 'responded' })])
    expect(batches.map((b) => b.map((x) => x.id))).toEqual([['1']])
  })
})
