import { render, screen } from '@testing-library/react'
import { LoadingState } from './LoadingState'

// i18n은 테스트에서 초기화되지 않는다. 저장소 관례대로 목을 두고 키를 검사한다.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe('LoadingState', () => {
  it('announces loading to assistive tech', () => {
    render(<LoadingState />)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveAccessibleName('common.loading')
  })

  it('renders the requested number of rows', () => {
    const { container } = render(<LoadingState rows={5} />)
    expect(container.querySelectorAll('[data-skeleton-row]')).toHaveLength(5)
  })

  it('defaults to three rows', () => {
    const { container } = render(<LoadingState />)
    expect(container.querySelectorAll('[data-skeleton-row]')).toHaveLength(3)
  })

  it('renders one block per stat tile in stat shape', () => {
    const { container } = render(<LoadingState shape="stat" rows={2} />)
    expect(container.querySelectorAll('[data-skeleton-row]')).toHaveLength(2)
    expect(container.firstElementChild).toHaveAttribute('data-shape', 'stat')
  })
})
