/**
 * 미리 등록된 칠십인이 처음 로그인할 때(mergePreRegisteredUser) 담당 칠십인으로 그 칠십인을 가리키는
 * 문서들 — 집행서기 계정(관리자 + 부역할 집행서기 포함)과 아직 가입 전인 집행서기 초대장.
 * 옛 uid에 남으면 그날부터 집행서기 화면에서 담당 칠십인이 사라지고, 나중에 가입하는 집행서기도
 * 없는 uid에 묶인다. 사용자 결정: 칠십인이 로그인해도 집행서기 연결은 그대로 유지돼야 한다.
 *
 * firebase-admin을 쓰지 않는다(테스트에 설치돼 있지 않다) — 쓰는 Firestore 표면만 받는다.
 */
interface QueryLike<R> {
  where(field: string, op: string, value: unknown): QueryLike<R>
  get(): Promise<{ docs: Array<{ ref: R }> }>
}

export interface AssignedSeventyDb<R> {
  collection(name: string): QueryLike<R>
}

export const ASSIGNED_SEVENTY_COLLECTIONS = ['users', 'invites'] as const

export async function findAssignedSeventyRefs<R>(db: AssignedSeventyDb<R>, preUid: string): Promise<R[]> {
  const snaps = await Promise.all(
    ASSIGNED_SEVENTY_COLLECTIONS.map((name) =>
      db.collection(name).where('assignedSeventyUid', '==', preUid).get(),
    ),
  )
  return snaps.flatMap((snap) => snap.docs.map((d) => d.ref))
}

/**
 * 그 칠십인 것인 기록 — 방문 요청·태스크·방문 계획. 일정(schedules)은 병합 함수가 따로 옮긴다.
 * 옛 uid에 남으면 첫 로그인 뒤 칠십인·집행서기 화면에서 이 기록들이 사라진다.
 */
export const SEVENTY_OWNED_COLLECTIONS = ['visitRequests', 'tasks', 'visitPlans'] as const

export async function findSeventyOwnedRefs<R>(db: AssignedSeventyDb<R>, preUid: string): Promise<R[]> {
  const snaps = await Promise.all(
    SEVENTY_OWNED_COLLECTIONS.map((name) => db.collection(name).where('seventyUid', '==', preUid).get()),
  )
  return snaps.flatMap((snap) => snap.docs.map((d) => d.ref))
}
