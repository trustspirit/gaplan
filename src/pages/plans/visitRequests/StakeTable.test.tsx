import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RequestUnit } from '../../../../functions/src/visitRequestLogic'
import { StakeTable } from './StakeTable'
import { planMatrix } from './stakeSundayMatrix'

const unit = (id: string, regionId: string): RequestUnit => ({
  id, ko: `${id.toUpperCase()} 스테이크`, en: '', regionId, wards: [{ id: `${id}1`, ko: `${id}1`, en: '' }],
})

const matrix = (units: RequestUnit[], sundayRegions?: Record<string, string>) =>
  planMatrix({
    request: {
      sundays: ['2027-01-10', '2027-01-17', '2027-02-07'],
      units,
      sundayRegions,
      unitSundays: { a: ['2027-01-10', '2027-02-07'], b: ['2027-01-10', '2027-01-17'] },
    },
    roles: { '2027-01-10': { primary: 'a', backup: 'b' }, '2027-01-17': { primary: 'b' } },
    status: {},
    wardStats: { a1: { lastVisit: '2026-03-01', nextVisit: null, count12m: 1 } },
  })

const cells = (row: HTMLElement) => within(row).getAllByRole('cell')

describe('StakeTable', () => {
  it('shows one row per stake with each Sunday’s role and the counts', () => {
    render(<StakeTable matrix={matrix([unit('a', 'r1'), unit('b', 'r1')])} today="2026-11-24" />)
    const rowA = screen.getByRole('row', { name: /^A 스테이크/ })
    expect(cells(rowA).map((c) => c.textContent)).toEqual([
      expect.stringContaining('visitRequest.matrix.cell.primary'),
      expect.stringContaining('visitRequest.matrix.cell.none'),
      expect.stringContaining('visitRequest.matrix.cell.asked'),
      '1 / 0 +1',
    ])
    expect(cells(screen.getByRole('row', { name: /^B 스테이크/ })).at(-1)).toHaveTextContent('1 / 1')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('groups the months over their Sundays', () => {
    render(<StakeTable matrix={matrix([unit('a', 'r1'), unit('b', 'r1')])} today="2026-11-24" />)
    const months = screen.getAllByRole('columnheader').filter((h) => h.getAttribute('scope') === 'colgroup')
    expect(months.map((h) => h.getAttribute('colspan'))).toEqual(['2', '1'])
  })

  it('lets a cell be clicked to ask or drop that Sunday, but not a Sunday the stake cannot take', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <StakeTable
        matrix={matrix([unit('a', 'seoul'), unit('b', 'seoul-south')], {
          '2027-01-10': 'seoul', '2027-01-17': 'seoul-south', '2027-02-07': 'seoul',
        })}
        today="2026-11-24"
        onToggle={onToggle}
        cellDetail={(_, date) => (date === '2027-01-17' ? '서울남 CC 차례' : undefined)}
      />,
    )
    const rowA = screen.getByRole('row', { name: /^A 스테이크/ })
    // 1/17은 서울남 차례라 누를 수 없다 — 칸은 남아 있고 이유를 적는다
    expect(within(rowA).getAllByRole('button')).toHaveLength(2)
    expect(cells(rowA)[1]).toHaveTextContent('서울남 CC 차례')
    await user.click(within(rowA).getAllByRole('button')[1])
    expect(onToggle).toHaveBeenCalledWith('a', '2027-02-07')
  })

  it('locks the row being saved', () => {
    render(
      <StakeTable matrix={matrix([unit('a', 'r1'), unit('b', 'r1')])} today="2026-11-24" onToggle={vi.fn()} savingUnit="a" />,
    )
    within(screen.getByRole('row', { name: /^A 스테이크/ })).getAllByRole('button').forEach((b) => expect(b).toBeDisabled())
    within(screen.getByRole('row', { name: /^B 스테이크/ })).getAllByRole('button').forEach((b) => expect(b).toBeEnabled())
  })

  it('adds the extra columns after the counts', () => {
    render(
      <StakeTable
        matrix={matrix([unit('a', 'r1'), unit('b', 'r1')])}
        today="2026-11-24"
        columns={[{ key: 'x', header: '응답', render: (row) => `응답-${row.unit.id}` }]}
      />,
    )
    expect(screen.getByRole('columnheader', { name: '응답' })).toBeInTheDocument()
    expect(cells(screen.getByRole('row', { name: /^A 스테이크/ })).at(-1)).toHaveTextContent('응답-a')
  })
})
