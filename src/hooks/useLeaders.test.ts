import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLeaders } from './useLeaders'
import * as leaderService from '@/services/leaderService'
import type { Leader } from '@/types/leader'

const MOCK_LEADERS: Leader[] = [
  {
    id: '506664',
    externalUnitId: 506664,
    unitNameKo: '서울 스테이크',
    unitNameEn: 'Seoul Stake',
    role: '스테이크 회장',
    name: '하태완',
    phone: '010-8860-5981',
    email: 'hataewan@hotmail.com',
  },
]

vi.mock('@/services/leaderService')

describe('useLeaders', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('초기에는 빈 배열과 loading=true를 반환한다', () => {
    vi.mocked(leaderService.subscribeToLeaders).mockImplementation(() => () => {})
    const { result } = renderHook(() => useLeaders())
    expect(result.current.leaders).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('데이터를 받으면 leaders를 업데이트하고 loading을 false로 바꾼다', () => {
    vi.mocked(leaderService.subscribeToLeaders).mockImplementation((onData) => {
      onData(MOCK_LEADERS)
      return () => {}
    })
    const { result } = renderHook(() => useLeaders())
    expect(result.current.leaders).toEqual(MOCK_LEADERS)
    expect(result.current.loading).toBe(false)
  })

  it('getLeaderByUnitName으로 unitNameKo 매칭 조회가 가능하다', () => {
    vi.mocked(leaderService.subscribeToLeaders).mockImplementation((onData) => {
      onData(MOCK_LEADERS)
      return () => {}
    })
    const { result } = renderHook(() => useLeaders())
    const found = result.current.getLeaderByUnitName('서울 스테이크')
    expect(found?.name).toBe('하태완')
    const notFound = result.current.getLeaderByUnitName('존재하지않는')
    expect(notFound).toBeUndefined()
  })
})
