import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SwipeOpenRowContext } from './swipeOpenRowContext'

/** 열린 행 하나를 목록 단위로 들고 있는다. 감싸지 않은 목록의 행은 열리지 않는다. */
export function SwipeOpenRowProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)

  const open = useCallback((id: string) => setOpenId(id), [])
  const close = useCallback(() => setOpenId(null), [])

  // 스크롤이 시작되면 닫는다 — 열어둔 채 목록을 훑으면 그 행만 계속 밀려 있어
  // 어디까지 봤는지가 흐트러진다. capture로 듣는 이유는 스크롤 컨테이너가
  // 이 Provider 바깥일 수 있기 때문이다.
  useEffect(() => {
    if (openId === null) return
    const onScroll = () => setOpenId(null)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [openId])

  const value = useMemo(() => ({ openId, open, close }), [openId, open, close])

  return <SwipeOpenRowContext.Provider value={value}>{children}</SwipeOpenRowContext.Provider>
}
