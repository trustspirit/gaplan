import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeadersPage } from './LeadersPage'
import * as useLeadersModule from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'

vi.mock('@/hooks/useLeaders')
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => true }))
vi.mock('@/services/leaderService', () => ({
  updateLeader: vi.fn().mockResolvedValue(undefined),
  subscribeToLeaders: vi.fn(),
}))

beforeAll(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })) as unknown as typeof IntersectionObserver
})
vi.mock('jotai', () => ({
  useSetAtom: () => vi.fn(),
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
    AppShell: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="app-shell">{children}</div>
    ),
    TopBar: () => <div data-testid="top-bar" />,
  }
})

const MOCK_LEADERS: Leader[] = [
  {
    id: '1',
    externalUnitId: 1,
    unitNameKo: '서울 스테이크',
    unitNameEn: 'Seoul Stake',
    role: '스테이크 회장',
    name: '홍길동',
    phone: '010-1111-2222',
  },
  {
    id: '2',
    externalUnitId: 2,
    unitNameKo: '녹번 와드',
    unitNameEn: 'Nokbeon Ward',
    role: '감독',
    name: '김철수',
    phone: '010-3333-4444',
    email: 'kim@test.com',
  },
]

describe('LeadersPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // clearAllMocks가 mockReturnValue까지 지운다. 로그인 사용자는 테스트마다
    // 관리자에서 다시 출발한다 — 역할을 바꾸는 테스트가 뒤에 영향을 주지 않도록.
    const { useAtomValue } = await import('jotai')
    vi.mocked(useAtomValue).mockReturnValue({ uid: 'test', role: 'admin', name: '관리자' })
  })

  it('로딩 중에는 skeleton을 표시한다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: [],
      loading: true,
      getLeaderByUnitName: vi.fn(),
    })
    const { container } = render(<LeadersPage />)
    expect(container.querySelectorAll('[class*="skeleton"]').length).toBeGreaterThan(0)
  })

  it('지도자 이름을 렌더링한다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS,
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('김철수')).toBeInTheDocument()
  })

  it('검색어로 이름 필터링이 된다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS,
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)
    fireEvent.change(screen.getByPlaceholderText('leaders.searchPlaceholder'), {
      target: { value: '홍길동' },
    })
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.queryByText('김철수')).not.toBeInTheDocument()
  })

  it('편집 버튼을 누르면 해당 지도자 값이 채워진 시트가 열린다', () => {
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS,
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '김철수 정보 수정' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('leaders.name')).toHaveValue('김철수')
    expect(screen.getByLabelText('leaders.phone')).toHaveValue('010-3333-4444')
  })

  // 판정 R44 — 주소록은 칠십인에게 열렸지만 firestore.rules의 write는 여전히
  // admin 전용이다. 버튼을 그대로 두면 누르면 규칙 계층에서 거부되는 버튼이 된다.
  it('칠십인에게는 편집 버튼을 내주지 않는다', async () => {
    const { useAtomValue } = await import('jotai')
    vi.mocked(useAtomValue).mockReturnValue({ uid: 'sv1', role: 'seventy', name: '칠십인' })
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS,
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)

    // 명단은 그대로 보인다 — 막는 것은 편집뿐이다.
    expect(screen.getByText('김철수')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /정보 수정/ })).not.toBeInTheDocument()
  })

  it('저장하면 해당 지도자 id로 updateLeader를 호출한다', async () => {
    const { updateLeader } = await import('@/services/leaderService')
    vi.mocked(useLeadersModule.useLeaders).mockReturnValue({
      leaders: MOCK_LEADERS,
      loading: false,
      getLeaderByUnitName: vi.fn(),
    })
    render(<LeadersPage />)

    fireEvent.click(screen.getByRole('button', { name: '김철수 정보 수정' }))
    fireEvent.change(screen.getByLabelText('leaders.email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'leaders.save' }))

    await waitFor(() =>
      expect(updateLeader).toHaveBeenCalledWith('2', {
        name: '김철수',
        phone: '010-3333-4444',
        email: '',
      }),
    )
  })
})
