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

  // 접근성 이름을 바꾸는 프롭은 'aria-label'이라 부른다 — Switch.label처럼
  // 화면에 보이는 텍스트로 오해할 이름을 쓰지 않는다
  it('takes its accessible name from aria-label', () => {
    render(<LoadingState aria-label="일정 불러오는 중" />)
    expect(screen.getByRole('status')).toHaveAccessibleName('일정 불러오는 중')
  })

  it('renders no visible text for the accessible name', () => {
    render(<LoadingState aria-label="일정 불러오는 중" />)
    expect(screen.queryByText('일정 불러오는 중')).not.toBeInTheDocument()
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
