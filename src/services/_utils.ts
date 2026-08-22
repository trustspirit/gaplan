import type { QuerySnapshot, DocumentData, FirestoreError } from 'firebase/firestore'

export const mapDocs = <T>(snap: QuerySnapshot<DocumentData>): T[] =>
  snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)

export const snapshotErrHandler =
  (tag: string, onError?: (e: Error) => void) =>
  (err: FirestoreError): void => {
    console.error(`[${tag}] onSnapshot error:`, err.code, err.message)
    onError?.(err)
  }

// Firestore의 addDoc/updateDoc은 값이 undefined인 필드가 있으면 통째로 거부한다.
// null / '' / 0 / false / []는 의미 있는 값이므로 보존하고, undefined 키만 얕게 걷어낸다.
// 중첩 객체까지 재귀적으로 훑으면 배열/맵 필드를 조용히 새 객체로 바꿔버리므로 하지 않는다.
export const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const result = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}
