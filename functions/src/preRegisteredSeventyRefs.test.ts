import { describe, it, expect } from 'vitest'
import { findAssignedSeventyRefs, findSeventyOwnedRefs } from './preRegisteredSeventyRefs'

type Doc = { id: string; ref: string; data: () => Record<string, unknown> }

function db(collections: Record<string, Doc[]>) {
  return {
    collection: (name: string) => {
      const filters: Array<[string, unknown]> = []
      const q = {
        where: (field: string, _op: string, value: unknown) => {
          filters.push([field, value])
          return q
        },
        get: async () => ({
          docs: (collections[name] ?? []).filter((d) => filters.every(([f, v]) => d.data()[f] === v)),
        }),
      }
      return q
    },
  }
}

const doc = (col: string, id: string, data: Record<string, unknown>): Doc => ({ id, ref: `${col}/${id}`, data: () => data })

describe('findAssignedSeventyRefs', () => {
  it('그 칠십인을 담당으로 둔 집행서기 계정과 아직 가입 전인 초대장을 모두 찾는다', async () => {
    const refs = await findAssignedSeventyRefs(
      db({
        users: [
          doc('users', 'es1', { role: 'exec_secretary', assignedSeventyUid: 'pre1' }),
          doc('users', 'adm', { role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'pre1' }),
          doc('users', 'es2', { role: 'exec_secretary', assignedSeventyUid: 'other' }),
        ],
        invites: [
          doc('invites', 'a@x', { role: 'exec_secretary', assignedSeventyUid: 'pre1' }),
          doc('invites', 'b@x', { role: 'exec_secretary', assignedSeventyUid: 'other' }),
        ],
      }) as never,
      'pre1',
    )

    expect(refs.sort()).toEqual(['invites/a@x', 'users/adm', 'users/es1'])
  })

  it('담당으로 둔 곳이 없으면 빈 목록', async () => {
    expect(await findAssignedSeventyRefs(db({}) as never, 'pre1')).toEqual([])
  })
})

describe('findSeventyOwnedRefs', () => {
  it('그 칠십인 것인 방문 요청·태스크·방문 계획을 모두 찾고, 다른 칠십인 것은 뺀다', async () => {
    const refs = await findSeventyOwnedRefs(
      db({
        visitRequests: [doc('visitRequests', 'r1', { seventyUid: 'pre1' }), doc('visitRequests', 'r2', { seventyUid: 'x' })],
        tasks: [doc('tasks', 't1', { seventyUid: 'pre1' })],
        visitPlans: [doc('visitPlans', 'p1', { seventyUid: 'pre1' }), doc('visitPlans', 'p2', { seventyUid: 'x' })],
        schedules: [doc('schedules', 's1', { seventyUid: 'pre1' })],
      }) as never,
      'pre1',
    )

    // 일정(schedules)은 병합 함수가 따로 옮긴다 — 여기서 중복으로 고르지 않는다.
    expect(refs.sort()).toEqual(['tasks/t1', 'visitPlans/p1', 'visitRequests/r1'])
  })
})
