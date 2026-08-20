import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('applies width and height as inline styles', () => {
    render(<Skeleton data-testid="sk" width="10px" height="20px" />)
    const el = document.querySelector('[data-testid="sk"]') as HTMLElement
    expect(el.style.width).toBe('10px')
    expect(el.style.height).toBe('20px')
  })

  it('lets an explicit style prop override width/height', () => {
    render(<Skeleton data-testid="sk" width="10px" height="20px" style={{ width: '99px' }} />)
    const el = document.querySelector('[data-testid="sk"]') as HTMLElement
    expect(el.style.width).toBe('99px')
    expect(el.style.height).toBe('20px')
  })

  it('passes through arbitrary attributes without clobbering className', () => {
    render(
      <Skeleton
        className="custom"
        data-testid="sk"
        data-foo="bar"
        aria-label="loading"
        id="my-id"
      />,
    )
    const el = document.querySelector('[data-testid="sk"]') as HTMLElement
    expect(el).toHaveAttribute('data-foo', 'bar')
    expect(el).toHaveAttribute('aria-label', 'loading')
    expect(el).toHaveAttribute('id', 'my-id')
    expect(el.className).toContain('custom')
  })
})
