import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VisitStats } from '@/utils/visitStats'

const emptyStats: VisitStats = {
  byRegion: [],
  byUnit: [],
  monthlyTrend: [],
  lastVisit: [],
  staleTopN: [],
}

vi.mock('jotai', () => ({
  useAtomValue: () => ({ uid: 'admin-1', role: 'admin', name: '관리자' }),
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/useEffectiveScope', () => ({
  useEffectiveScope: () => ({ regionIds: null, actingSeventyUid: null }),
}))

vi.mock('@/hooks/useVisitStats', () => ({
  useVisitStats: () => ({
    stats: emptyStats,
    loading: false,
    error: new Error('permission denied'),
    reload: vi.fn(),
  }),
}))

vi.mock('@/components/layout', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TopBar: () => null,
}))

vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ title }: { title: string }) => <h3>{title}</h3>,
  CardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string },
  ) => {
    const { children, variant, size, ...buttonProps } = props
    void variant
    void size
    return <button {...buttonProps}>{children}</button>
  },
}))

vi.mock('@/components/domain/stats/StatsFilterBar', () => ({
  StatsFilterBar: () => <div />,
}))
vi.mock('@/components/domain/stats/VisitCountBarChart', () => ({
  VisitCountBarChart: () => <div />,
}))
vi.mock('@/components/domain/stats/MonthlyTrendChart', () => ({
  MonthlyTrendChart: () => <div />,
}))
vi.mock('@/components/domain/stats/LastVisitList', () => ({
  LastVisitList: () => <div />,
}))
vi.mock('@/components/domain/stats/StaleWardsCard', () => ({
  StaleWardsCard: () => <div />,
}))

import { StatsPage } from './StatsPage'

describe('StatsPage', () => {
  it('통계 로딩 실패를 빈 데이터 대신 오류로 보여준다', () => {
    render(<StatsPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('stats.loadFailed')
  })
})
