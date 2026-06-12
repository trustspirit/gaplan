import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeadersPage } from './LeadersPage'
import * as useLeadersModule from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'

vi.mock('@/hooks/useLeaders')
vi.mock('jotai', () => ({
  atom: vi.fn(),
  useAtomValue: vi.fn().mockReturnValue({ uid: 'test', role: 'admin', name: '관리자' }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// Mock the AppShell, TopBar to isolate component
vi.mock('@/components/layout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/layout')>()
  return {
    ...actual,
    AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
    TopBar: () => <div data-testid="top-bar" />,
  }
})

const MOCK_LEADERS: Leader[] = [
  { id: '1', externalUnitId: 1, unitNameKo: '서울 스테이크', unitNameEn: 'Seoul Stake', role: '스테이크 회장', name: '홍길동', phone: '010-1111-2222' },
  { id: '2', externalUnitId: 2, unitNameKo: '녹번 와드', unitNameEn: 'Nokbeon Ward', role: '감독', name: '김철수', phone: '010-3333-4444', email: 'kim@test.com' },
]

describe('LeadersPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('로딩 중에는 skeleton을 표시한다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [], loading: true, getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })

  it('지도자 이름을 렌더링한다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS, loading: false, getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('김철수')).toBeInTheDocument()
  })

  it('검색어로 이름 필터링이 된다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS, loading: false, getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)
    fireEvent.change(screen.getByPlaceholderText('leaders.searchPlaceholder'), { target: { value: '홍길동' } })
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.queryByText('김철수')).not.toBeInTheDocument()
  })
})
