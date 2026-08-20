import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState, ErrorState, ForbiddenState } from './State'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe('State components', () => {
  it('EmptyState falls back to the default title', () => {
    render(<EmptyState />)
    expect(screen.getByText('state.emptyTitle')).toBeInTheDocument()
  })

  it('EmptyState prefers the given title and renders its action', () => {
    render(<EmptyState title="계획이 없습니다" action={<button>새 계획</button>} />)
    expect(screen.getByText('계획이 없습니다')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새 계획' })).toBeInTheDocument()
  })

  it('ErrorState renders a retry button that calls onRetry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('ErrorState omits the retry button when onRetry is absent', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  // 에러는 스크린리더가 즉시 읽어야 한다
  it('ErrorState announces itself politely', () => {
    render(<ErrorState />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('ForbiddenState explains and offers a way out', () => {
    render(<ForbiddenState action={<a href="/">홈으로</a>} />)
    expect(screen.getByText('state.forbiddenTitle')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈으로' })).toBeInTheDocument()
  })
})
