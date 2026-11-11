import { render, screen, fireEvent, within } from '@testing-library/react'
import type { RegionCoverage, UnitCoverage, UnitInterviewStatus, WardPriority } from '@/utils/visitInsights'
import { RegionCoverageChart } from './RegionCoverageChart'
import { WardCoverageGrid } from './WardCoverageGrid'
import { VisitPriorityList, PRIORITY_COLLAPSED_COUNT } from './VisitPriorityList'
import { InterviewStatusTable } from './InterviewStatusTable'

// 번역 키와 넘긴 값을 함께 돌려줘, 어떤 숫자가 화면에 실리는지 확인할 수 있게 한다.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) =>
      o ? `${k}:${Object.values(o).join('/')}` : k,
  }),
}))

describe('RegionCoverageChart', () => {
  const regions: RegionCoverage[] = [
    { id: 'seoul', name: '서울 CC', wardsTotal: 8, wardsVisited: 2, visits: 6 },
    { id: 'busan', name: '부산 CC', wardsTotal: 4, wardsVisited: 4, visits: 4 },
  ]

  // 횟수는 서울이 더 많지만(6 vs 4) 범위는 부산이 더 넓다(25% vs 100%) — 막대는 범위를 그린다.
  it('막대는 방문 횟수가 아니라 방문한 와드의 비율을 나타낸다', () => {
    render(<RegionCoverageChart regions={regions} />)
    expect(screen.getByRole('meter', { name: 'stats.coverageAria:서울 CC' })).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByRole('meter', { name: 'stats.coverageAria:부산 CC' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('방문 횟수와 와드당 평균을 글자로 곁들인다', () => {
    render(<RegionCoverageChart regions={regions} />)
    expect(screen.getByText('stats.regionVisits:6/0.8')).toBeInTheDocument()
    expect(screen.getByText('stats.coverageFraction:2/8')).toBeInTheDocument()
  })

  it('지역이 없으면 데이터 없음을 보여준다', () => {
    render(<RegionCoverageChart regions={[]} />)
    expect(screen.getByText('stats.noData')).toBeInTheDocument()
  })
})

describe('WardCoverageGrid', () => {
  const units: UnitCoverage[] = [
    {
      id: 'u1', name: '서울 스테이크', regionId: 'seoul', regionName: '서울 CC',
      wardsTotal: 2, wardsVisited: 1, visits: 2,
      wards: [
        { id: 'w1', name: '녹번 와드', unitId: 'u1', visits: 2, lastVisitDate: '2026-05-01', nextVisitDate: null },
        { id: 'w2', name: '신촌 와드', unitId: 'u1', visits: 0, lastVisitDate: null, nextVisitDate: '2026-07-05' },
      ],
    },
    {
      id: 'u2', name: '서울 동 스테이크', regionId: 'seoul', regionName: '서울 CC',
      wardsTotal: 1, wardsVisited: 0, visits: 0,
      wards: [{ id: 'w3', name: '교문 와드', unitId: 'u2', visits: 0, lastVisitDate: null, nextVisitDate: null }],
    },
  ]

  it('와드마다 칸 하나를 그리고 방문 횟수를 숫자로 적는다', () => {
    render(<WardCoverageGrid units={units} />)
    const cell = screen.getByRole('button', { name: /^녹번 와드/ })
    expect(within(cell).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /^교문 와드/ })).getByText('0')).toBeInTheDocument()
  })

  it('방문이 잡혀 있는 와드는 칸 이름에 예정일을 싣는다', () => {
    render(<WardCoverageGrid units={units} />)
    expect(screen.getByRole('button', { name: /신촌 와드.*stats\.planned:7\.5/ })).toBeInTheDocument()
  })

  it('같은 CC의 스테이크가 이어지면 CC 이름은 한 번만 적는다', () => {
    render(<WardCoverageGrid units={units} />)
    expect(screen.getAllByText('서울 CC')).toHaveLength(1)
  })

  it('칸을 누르면 그 와드를 넘긴다', () => {
    const onSelect = vi.fn()
    render(<WardCoverageGrid units={units} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /^교문 와드/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'w3', name: '교문 와드' }))
  })
})

describe('VisitPriorityList', () => {
  const ward = (i: number, over: Partial<WardPriority> = {}): WardPriority => ({
    id: `w${i}`, name: `와드 ${i}`, unitId: 'u1', unitName: '서울 스테이크', regionId: 'seoul',
    visits: 0, lastVisitDate: null, nextVisitDate: null, daysSince: null, ...over,
  })

  it('방문 이력이 없는 곳과 경과 일수를 구분해 보여준다', () => {
    render(
      <VisitPriorityList
        wards={[ward(1), ward(2, { lastVisitDate: '2026-01-10', daysSince: 151 })]}
      />,
    )
    expect(screen.getByText('stats.neverVisited')).toBeInTheDocument()
    expect(screen.getByText('stats.daysAgo:151')).toBeInTheDocument()
    expect(screen.getByText('2026.1.10')).toBeInTheDocument()
  })

  it('방문이 잡혀 있으면 예정일을 보여준다', () => {
    render(<VisitPriorityList wards={[ward(1, { nextVisitDate: '2026-07-05' })]} />)
    expect(screen.getByText('stats.planned:7.5')).toBeInTheDocument()
  })

  it('처음에는 일부만 보이고, 전체 보기를 누르면 모두 보인다', () => {
    const wards = Array.from({ length: PRIORITY_COLLAPSED_COUNT + 3 }, (_, i) => ward(i + 1))
    render(<VisitPriorityList wards={wards} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(PRIORITY_COLLAPSED_COUNT)
    fireEvent.click(screen.getByRole('button', { name: `stats.showAll:${wards.length}` }))
    expect(screen.getAllByRole('listitem')).toHaveLength(wards.length)
    expect(screen.getByRole('button', { name: 'stats.showLess' })).toBeInTheDocument()
  })

  it('줄을 누르면 그 와드를 넘긴다', () => {
    const onSelect = vi.fn()
    render(<VisitPriorityList wards={[ward(1)]} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /와드 1/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }))
  })
})

describe('InterviewStatusTable', () => {
  const rows: UnitInterviewStatus[] = [
    {
      unitId: 'u1', unitName: '서울 스테이크', regionId: 'seoul', regionName: '서울 CC',
      lastContactDate: '2026-02-10',
      quarters: [
        { key: '2025-Q4', start: '2025-10-01', end: '2025-12-31', isCurrent: false, contact: 'none' },
        { key: '2026-Q1', start: '2026-01-01', end: '2026-03-31', isCurrent: false, contact: 'done' },
        { key: '2026-Q2', start: '2026-04-01', end: '2026-06-30', isCurrent: true, contact: 'scheduled' },
      ],
    },
  ]

  it('분기마다 상태를 낱말로 적는다 — 색만으로 구분하지 않는다', () => {
    render(<InterviewStatusTable rows={rows} />)
    const row = within(screen.getByRole('row', { name: /서울 스테이크/ }))
    expect(row.getByText('stats.interview.none')).toBeInTheDocument()
    expect(row.getByText('stats.interview.done')).toBeInTheDocument()
    expect(row.getByText('stats.interview.scheduled')).toBeInTheDocument()
  })

  it('이번 분기 열은 "이번 분기"로, 지난 분기는 연도와 분기로 적는다', () => {
    render(<InterviewStatusTable rows={rows} />)
    expect(screen.getByRole('columnheader', { name: 'stats.thisQuarter' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'stats.quarterLabel:26/1' })).toBeInTheDocument()
  })

  it('마지막 접견일을 보여주고, 없으면 없음이라고 적는다', () => {
    const { rerender } = render(<InterviewStatusTable rows={rows} />)
    expect(screen.getByText('2026.2.10')).toBeInTheDocument()
    rerender(<InterviewStatusTable rows={[{ ...rows[0], lastContactDate: null }]} />)
    expect(screen.getByText('stats.interviewNever')).toBeInTheDocument()
  })
})
