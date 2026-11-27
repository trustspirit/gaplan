import { describe, it, expect } from 'vitest'
import { findAssignedSeventyRefs } from './preRegisteredSeventyRefs'

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
