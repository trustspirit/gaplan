import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

// `npm run test:rules`로 돈다 — Firestore 에뮬레이터가 있어야 해서 기본 `npm test`에는 없다.

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gaplan',
    firestore: { rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

/** 규칙을 건너뛰고 시드 데이터를 넣는다. */
async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data)
  })
}

function as(uid: string, email = `${uid}@example.com`) {
  return env.authenticatedContext(uid, { email, email_verified: true }).firestore()
}

describe('users create', () => {
  it('lets an uninvited user save themselves as pending', async () => {
    await assertSucceeds(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'pending', unitId: 'unit-1', createdAt: 1,
      }),
    )
  })

  it('refuses an uninvited user who claims to be a president', async () => {
    await assertFails(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'president', unitId: 'unit-1', createdAt: 1,
      }),
    )
  })

  it('refuses a pending user who smuggles in authz fields', async () => {
    await assertFails(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'pending', unitId: 'unit-1',
        assignedSeventyUid: 's1', createdAt: 1,
      }),
    )
  })

  it('lets an invited president save themselves as president', async () => {
    await seed('invites/u1@example.com', { role: 'president' })
    await assertSucceeds(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'president', unitId: 'unit-1', createdAt: 1,
      }),
    )
  })

  it('refuses an exec_secretary invite used to become a seventy', async () => {
    await seed('invites/u1@example.com', { role: 'exec_secretary', assignedSeventyUid: 's1' })
    await assertFails(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'seventy', createdAt: 1,
      }),
    )
  })

  it('takes the seventy regions from the invite', async () => {
    await seed('invites/u1@example.com', {
      role: 'seventy', assignedRegionIds: ['seoul', 'busan'], assignedRegionId: 'seoul',
    })
    await assertSucceeds(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'seventy',
        regionIds: ['seoul', 'busan'], regionId: 'seoul', createdAt: 1,
      }),
    )
  })

  it('refuses a seventy who picks regions the invite did not give', async () => {
    await seed('invites/u1@example.com', {
      role: 'seventy', assignedRegionIds: ['seoul'], assignedRegionId: 'seoul',
    })
    await assertFails(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'seventy',
        regionIds: ['seoul', 'busan'], regionId: 'seoul', createdAt: 1,
      }),
    )
  })

  it('accepts a legacy invite that only has assignedRegionId', async () => {
    await seed('invites/u1@example.com', { role: 'seventy', assignedRegionId: 'seoul' })
    await assertSucceeds(
      setDoc(doc(as('u1'), 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'seventy',
        regionIds: ['seoul'], regionId: 'seoul', createdAt: 1,
      }),
    )
  })

  it('takes the exec_secretary seventy from the invite', async () => {
    await seed('invites/u1@example.com', { role: 'exec_secretary', assignedSeventyUid: 's1' })
    const db = as('u1')
    await assertFails(
      setDoc(doc(db, 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'exec_secretary',
        assignedSeventyUid: 's2', createdAt: 1,
      }),
    )
    await assertSucceeds(
      setDoc(doc(db, 'users/u1'), {
        email: 'u1@example.com', name: '홍길동', role: 'exec_secretary',
        assignedSeventyUid: 's1', createdAt: 1,
      }),
    )
  })
})

describe('users self-update', () => {
  beforeEach(async () => {
    await seed('users/x1', { role: 'exec_secretary', name: '집행서기', assignedSeventyUid: 's1' })
  })

  it('lets a user rename themselves and mark the calendar connected', async () => {
    await assertSucceeds(updateDoc(doc(as('x1'), 'users/x1'), { name: '새 이름' }))
    await assertSucceeds(updateDoc(doc(as('x1'), 'users/x1'), { calendarConnected: true }))
  })

  it('refuses a user who reassigns their own seventy or regions', async () => {
    await assertFails(updateDoc(doc(as('x1'), 'users/x1'), { assignedSeventyUid: 's2' }))
    await assertFails(updateDoc(doc(as('x1'), 'users/x1'), { regionIds: ['busan'] }))
    await assertFails(updateDoc(doc(as('x1'), 'users/x1'), { role: 'admin' }))
  })

  it('still lets an admin edit another user', async () => {
    await seed('users/a1', { role: 'admin' })
    await assertSucceeds(updateDoc(doc(as('a1'), 'users/x1'), { assignedSeventyUid: 's2' }))
  })
})

describe('settings read', () => {
  beforeEach(async () => {
    await seed('users/p1', { role: 'president' })
    await seed('users/x1', { role: 'exec_secretary' })
    await seed('settings/publicTokens', { tok: '__all__' })
    await seed('settings/calendar', { calendars: {} })
  })

  it('hides the public link tokens from presidents', async () => {
    await assertFails(getDoc(doc(as('p1'), 'settings/publicTokens')))
    await assertFails(getDoc(doc(as('p1'), 'settings/public')))
    await assertFails(getDoc(doc(as('p1'), 'settings/publicUnits')))
  })

  it('lets the exec_secretary read the link documents they manage', async () => {
    await assertSucceeds(getDoc(doc(as('x1'), 'settings/publicTokens')))
  })

  it('keeps the calendar and admin documents readable to any signed-in user', async () => {
    await assertSucceeds(getDoc(doc(as('p1'), 'settings/calendar')))
    // 아직 users 문서가 없는 신규 가입자도 가입 흐름에서 읽는다.
    await assertSucceeds(getDoc(doc(as('new'), 'settings/admin')))
  })
})

describe('generalSchedules write', () => {
  beforeEach(async () => {
    await seed('users/s1', { role: 'seventy' })
    await seed('users/s2', { role: 'seventy' })
    await seed('users/a1', { role: 'admin' })
    await seed('generalSchedules/g1', { title: '행사', createdBy: 's1' })
  })

  it('lets the creator edit and delete their event', async () => {
    await assertSucceeds(updateDoc(doc(as('s1'), 'generalSchedules/g1'), { title: '수정' }))
    await assertSucceeds(deleteDoc(doc(as('s1'), 'generalSchedules/g1')))
  })

  it("refuses another seventy who edits or deletes someone else's event", async () => {
    await assertFails(updateDoc(doc(as('s2'), 'generalSchedules/g1'), { title: '수정' }))
    await assertFails(deleteDoc(doc(as('s2'), 'generalSchedules/g1')))
  })

  it('refuses a creator who hands the event to someone else', async () => {
    await assertFails(updateDoc(doc(as('s1'), 'generalSchedules/g1'), { createdBy: 's2' }))
  })

  it('refuses creating an event in someone else’s name', async () => {
    await assertFails(setDoc(doc(as('s1'), 'generalSchedules/g2'), { title: '행사', createdBy: 's2' }))
    await assertSucceeds(setDoc(doc(as('s1'), 'generalSchedules/g3'), { title: '행사', createdBy: 's1' }))
  })

  it("lets an admin edit anyone's event", async () => {
    await assertSucceeds(updateDoc(doc(as('a1'), 'generalSchedules/g1'), { title: '수정' }))
  })
})
