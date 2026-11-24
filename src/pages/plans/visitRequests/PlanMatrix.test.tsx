import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { RequestUnit } from '../../../../functions/src/visitRequestLogic'
import { PlanMatrix } from './PlanMatrix'
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

describe('PlanMatrix', () => {
  it('shows one row per stake with each Sunday’s role and the counts', () => {
    render(<PlanMatrix matrix={matrix([unit('a', 'r1'), unit('b', 'r1')])} today="2026-11-24" />)
    const rowA = screen.getByRole('row', { name: /A 스테이크/ })
    expect(within(rowA).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      expect.stringContaining('visitRequest.matrix.cell.primary'),
      expect.stringContaining('visitRequest.matrix.cell.none'),
      expect.stringContaining('visitRequest.matrix.cell.asked'),
      '1 / 0 +1',
    ])
    const rowB = screen.getByRole('row', { name: /B 스테이크/ })
    expect(within(rowB).getAllByRole('cell').at(-1)).toHaveTextContent('1 / 1')
  })

  it('groups the months over their Sundays', () => {
    render(<PlanMatrix matrix={matrix([unit('a', 'r1'), unit('b', 'r1')])} today="2026-11-24" />)
    const months = screen.getAllByRole('columnheader').filter((h) => h.getAttribute('scope') === 'colgroup')
    expect(months.map((h) => h.getAttribute('colspan'))).toEqual(['2', '1'])
  })

  it('splits the stakes by CC when the request covers more than one', () => {
    render(
      <PlanMatrix
        matrix={matrix([unit('a', 'seoul'), unit('b', 'seoul-south')], {
          '2027-01-10': 'seoul', '2027-01-17': 'seoul-south', '2027-02-07': 'seoul',
        })}
        today="2026-11-24"
      />,
    )
    // a는 서울남 차례인 1/17을 물을 수 없다
    const rowA = screen.getByRole('row', { name: /A 스테이크/ })
    expect(within(rowA).getAllByRole('cell')[1]).toHaveTextContent('visitRequest.unitSundayBlock.otherRegion')
    expect(screen.getAllByRole('row')).toHaveLength(2 + 2 + 2) // 머리 2줄 + CC 2줄 + 스테이크 2줄
  })
})
