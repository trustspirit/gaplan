import { createContext, useContext } from 'react'

export interface SwipeOpenRowValue {
  openId: string | null
  open: (id: string) => void
  close: () => void
}

/**
 * 스와이프로 액션이 드러난 행은 목록 전체에서 하나뿐이어야 한다.
 *
 * 각 행이 자기 열림 상태를 들고 있으면 이걸 만들 수 없다 — 행은 형제가 열렸다는 걸
 * 모르기 때문이다. 그래서 열린 행의 id만 목록 위쪽(SwipeOpenRowProvider)에 둔다.
 *
 * 컨텍스트와 훅이 Provider와 다른 파일에 사는 이유는 react-refresh 규칙 때문이다:
 * 컴포넌트 파일이 컴포넌트 아닌 값을 함께 내보내면 fast refresh가 깨진다.
 */
export const SwipeOpenRowContext = createContext<SwipeOpenRowValue | null>(null)

/**
 * 이 행이 열려 있는지와, 열고 닫는 손잡이.
 * Provider가 없으면 열리지 않는 상태로 굳는다 — 스와이프를 안 쓰는 목록에서
 * 호출부가 아무것도 하지 않아도 되게 하려는 것이다.
 */
export function useSwipeOpenRow(id: string) {
  const ctx = useContext(SwipeOpenRowContext)

  return {
    enabled: ctx !== null,
    isOpen: ctx?.openId === id,
    open: () => ctx?.open(id),
    close: () => ctx?.close(),
  }
}
