import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>확인</Button>)
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
  })
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>확인</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not submit a parent form by default', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button>취소</Button>
      </form>,
    )

    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('is disabled when loading', () => {
    render(<Button loading>확인</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('keeps loading content in stable slots', () => {
    render(<Button loading>확인</Button>)
    const button = screen.getByRole('button', { name: '확인' })
    const label = screen.getByText('확인')
    const spinner = button.querySelector('svg')

    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(label).toHaveAttribute('data-button-label', 'true')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })
})
