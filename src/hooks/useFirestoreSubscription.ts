import { useEffect, useState } from 'react'

type SubscribeFn<T> = (onData: (data: T[]) => void, onError?: (e: Error) => void) => () => void

interface SharedState<T> {
  data: T[]
  loading: boolean
  error: Error | null
}

interface SharedEntry<T> {
  state: SharedState<T>
  listeners: Set<() => void>
  unsubscribe: () => void
}

// FIX 5 (최종 리뷰) — 같은 subscribeFn(예: subscribeToUsers)을 여러 컴포넌트가 동시에
// 부르면 원래는 컴포넌트 수만큼 onSnapshot 리스너가 열렸다. SystemPanel 하나에서만도
// UserListCard·InviteCard·PreRegisterCard·AvailabilitySettings가 각각 useUsers()를
// 불러 4개, EditUserModal이 열리면 5개였다. subscribeFn을 키로 구독 하나를 여러
// 컴포넌트가 나눠 쓴다 — 마지막 리스너가 떠날 때만 실제로 구독을 끊는다.
// subscribeFn은 각 훅(useUsers 등)에서 항상 같은 모듈 스코프 함수 참조이므로
// (subscribeToUsers처럼), Map 키로 쓰기에 안전하다.
const registry = new Map<SubscribeFn<unknown>, SharedEntry<unknown>>()

function getOrCreateEntry<T>(subscribeFn: SubscribeFn<T>): SharedEntry<T> {
  const key = subscribeFn as SubscribeFn<unknown>
  const existing = registry.get(key) as SharedEntry<T> | undefined
  if (existing) return existing

  const entry: SharedEntry<T> = {
    state: { data: [], loading: true, error: null },
    listeners: new Set(),
    unsubscribe: () => {},
  }
  const notify = () => entry.listeners.forEach((listener) => listener())
  entry.unsubscribe = subscribeFn(
    (d) => {
      entry.state = { data: d, loading: false, error: null }
      notify()
    },
    (e) => {
      entry.state = { ...entry.state, loading: false, error: e }
      notify()
    },
  )
  registry.set(key, entry as SharedEntry<unknown>)
  return entry
}

export function useFirestoreSubscription<T>(subscribeFn: SubscribeFn<T>) {
  // 마운트 직후(effect가 아직 안 돈 첫 렌더)에도 이미 다른 컴포넌트가 구독해 둔
  // 데이터가 있으면 그걸 그대로 보여준다 — 굳이 로딩 상태로 돌아갈 이유가 없다.
  const [, forceRender] = useState(0)
  const key = subscribeFn as SubscribeFn<unknown>
  const cached = registry.get(key) as SharedEntry<T> | undefined
  const state = cached?.state ?? { data: [] as T[], loading: true, error: null }

  useEffect(() => {
    const entry = getOrCreateEntry(subscribeFn)
    const onChange = () => forceRender((n) => n + 1)
    entry.listeners.add(onChange)
    // 구독 생성과 리스너 등록 사이에 데이터가 이미 도착했을 수 있으므로 한 번
    // 강제로 다시 그린다.
    onChange()

    return () => {
      entry.listeners.delete(onChange)
      if (entry.listeners.size === 0) {
        entry.unsubscribe()
        registry.delete(key)
      }
    }
    // subscribeFn is always a stable module-level function reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
