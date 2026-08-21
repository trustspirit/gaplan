import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegionCheckboxes } from './RegionCheckboxes'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('RegionCheckboxes', () => {
  it('offers every region', () => {
    render(<RegionCheckboxes selected={new Set()} onToggle={vi.fn()} />)
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1)
  })

  it('checks the ones already selected', () => {
    render(<RegionCheckboxes selected={new Set(['seoul'])} onToggle={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: '서울 CC' })).toBeChecked()
  })

  it('reports the region that was pressed', async () => {
    const onToggle = vi.fn()
    render(<RegionCheckboxes selected={new Set()} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '서울 CC' }))
    expect(onToggle).toHaveBeenCalledWith('seoul')
  })

  it('reports the same region when unchecking — the caller owns the set', async () => {
    const onToggle = vi.fn()
    render(<RegionCheckboxes selected={new Set(['seoul'])} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '서울 CC' }))
    expect(onToggle).toHaveBeenCalledWith('seoul')
  })
})
