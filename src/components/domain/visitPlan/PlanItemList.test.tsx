import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import type { LastVisitEntry } from '@/utils/visitStats'
import type { VisitPlanItem, GeneralSchedule } from '@/types'
import { PlanItemList } from './PlanItemList'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? `${k}:${opts.count}` : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

function item(over: Partial<VisitPlanItem> = {}): VisitPlanItem {
  return {
    itemId: 'i1',
    unitId: 'u1',
    wardName: '녹번 와드',
    date: '2026-03-12',
    startTime: '10:00',
    endTime: '11:00',
    ...over,
  }
}

describe('PlanItemList', () => {
  it('shows the empty message when there are no items', () => {
    render(
      <PlanItemList
        items={[]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('visitPlan.noItems')).toBeInTheDocument()
  })

  it('renders the ward, date, and start time for each item', () => {
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText(/녹번 와드/)).toBeInTheDocument()
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
  })

  // recency.daysSince === null (a recency entry exists but the ward has
  // never actually been visited) is distinct from no recency entry at all
  // (which renders no meta text — see the next test).
  it('shows never-visited text when the recency entry has a null daysSince', () => {
    const recency: LastVisitEntry = {
      id: '녹번 와드',
      name: '녹번 와드',
      regionId: 'seoul',
      lastVisitDate: null,
      daysSince: null,
      severity: 'red',
    }
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map([['녹번 와드', recency]])}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('stats.neverVisited')).toBeInTheDocument()
  })

  it('shows no recency text when there is no recency entry at all', () => {
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.queryByText('stats.neverVisited')).not.toBeInTheDocument()
    expect(screen.queryByText(/stats\.daysAgo/)).not.toBeInTheDocument()
  })

  // 등급은 색으로만 전해지면 안 된다 — 점에 title/aria-label로 이름을 단다.
  it('names the severity dot with the grade, not just its colour', () => {
    const recency: LastVisitEntry = {
      id: '녹번 와드',
      name: '녹번 와드',
      regionId: 'seoul',
      lastVisitDate: '2026-01-01',
      daysSince: 40,
      severity: 'green',
    }
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map([['녹번 와드', recency]])}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByRole('img', { name: 'stats.severity.green' })).toBeInTheDocument()
  })

  // No recency entry at all is the state the review flagged: meta renders
  // nothing, so the dot is the ONLY signal on the row. It still falls back
  // to severity 'red' and must still carry an accessible name for it.
  it('names the fallback red severity even when the dot is the only signal on the row', () => {
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByRole('img', { name: 'stats.severity.red' })).toBeInTheDocument()
  })

  it('shows the days-ago text when there is a recency entry', () => {
    const recency: LastVisitEntry = {
      id: '녹번 와드',
      name: '녹번 와드',
      regionId: 'seoul',
      lastVisitDate: '2026-01-01',
      daysSince: 40,
      severity: 'green',
    }
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map([['녹번 와드', recency]])}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('stats.daysAgo:40')).toBeInTheDocument()
  })

  it('warns when a nearby general schedule falls within the proximity window', () => {
    const nearby: GeneralSchedule = {
      id: 'g1',
      title: '지역대회',
      date: '2026-03-13',
      category: 'conference',
      createdBy: 'a1',
      createdAt: '2026-01-01',
      isPublic: true,
    }
    render(
      <PlanItemList
        items={[item({ unitId: 'u1', date: '2026-03-12' })]}
        lastVisitByWard={new Map()}
        generalSchedules={[nearby]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByText('visitPlan.nearConference')).toBeInTheDocument()
  })

  it('does not warn when there is no nearby general schedule', () => {
    render(
      <PlanItemList
        items={[item()]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.queryByText('visitPlan.nearConference')).not.toBeInTheDocument()
  })

  it('calls onRemove with the item id when the delete button is clicked', async () => {
    const onRemove = vi.fn()
    render(
      <PlanItemList
        items={[item({ itemId: 'abc' })]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={onRemove}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(onRemove).toHaveBeenCalledWith('abc')
  })

  it('filters out items whose id is pending deletion', () => {
    render(
      <PlanItemList
        items={[
          item({ itemId: 'a', wardName: '녹번 와드' }),
          item({ itemId: 'b', wardName: '갈현 와드' }),
        ]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
        pendingDeleteIds={new Set(['a'])}
      />,
    )
    expect(screen.queryByText(/녹번 와드/)).not.toBeInTheDocument()
    expect(screen.getByText(/갈현 와드/)).toBeInTheDocument()
  })

  it('sorts items by date then start time', () => {
    render(
      <PlanItemList
        items={[
          item({ itemId: 'later', wardName: '나중 와드', date: '2026-03-13', startTime: '09:00' }),
          item({
            itemId: 'earlier',
            wardName: '먼저 와드',
            date: '2026-03-12',
            startTime: '09:00',
          }),
        ]}
        lastVisitByWard={new Map()}
        generalSchedules={[]}
        onRemove={vi.fn()}
      />,
    )
    const texts = screen.getAllByText(/와드/).map((el) => el.textContent)
    expect(texts[0]).toContain('먼저')
    expect(texts[1]).toContain('나중')
  })

  // 판정 R57 — 행 앞의 색 막대 금지.
  it('never puts an accent stripe in front of the row', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'PlanItemList.module.scss'), 'utf8'))
  })
})
