import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Leader } from '@/types/leader'
import { mapDocs, snapshotErrHandler } from './_utils'

export function subscribeToLeaders(
  onData: (leaders: Leader[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'leaders'),
    snap => onData(mapDocs<Leader>(snap)),
    snapshotErrHandler('leaders', onError),
  )
}

export interface LeaderPatch {
  name: string
  phone?: string   // '' 이면 필드 삭제
  email?: string   // '' 이면 필드 삭제
}

const OPTIONAL_FIELDS = ['phone', 'email'] as const

// UI가 이미 검증하지만 여기서도 막는다. 서비스가 UI를 신뢰하면
// 나중에 다른 호출 지점이 생겼을 때 빈 이름이 조용히 들어간다.
export async function updateLeader(id: string, patch: LeaderPatch): Promise<void> {
  const name = patch.name.trim()
  if (!name) throw new Error('Leader name is required')

  const fields: Record<string, unknown> = { name }
  for (const key of OPTIONAL_FIELDS) {
    const value = patch[key]
    if (value === undefined) continue
    const trimmed = value.trim()
    // 빈 값은 deleteField로 제거한다. ''를 저장하면 주소록에
    // 빈 tel:/mailto: 링크가 렌더되고, undefined는 firebase v12가 거부한다.
    fields[key] = trimmed === '' ? deleteField() : trimmed
  }

  await updateDoc(doc(db, 'leaders', id), fields)
}
