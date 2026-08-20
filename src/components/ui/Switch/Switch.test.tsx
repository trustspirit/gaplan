import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'

describe('Switch', () => {
  it('exposes checkbox semantics with its label', () => {
    render(<Switch checked={false} onChange={() => {}} label="공개" />)
    const input = screen.getByRole('checkbox', { name: '공개' })
    expect(input).not.toBeChecked()
  })

  it('reports the next value on click', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} label="공개" />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reports false when switching off', async () => {
    const onChange = vi.fn()
    render(<Switch checked onChange={onChange} label="공개" />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('is toggleable by keyboard', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} label="공개" />)
    await userEvent.tab()
    await userEvent.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} label="공개" disabled />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('accepts aria-label when there is no visible label', () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="서울 지역 공개" />)
    expect(screen.getByRole('checkbox', { name: '서울 지역 공개' })).toBeInTheDocument()
  })
})
