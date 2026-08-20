import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders the title as the page level heading', () => {
    render(<PageHeader title="방문 계획" />)
    expect(screen.getByRole('heading', { level: 1, name: '방문 계획' })).toBeInTheDocument()
  })

  it('renders the description when given', () => {
    render(<PageHeader title="방문 계획" description="초안을 작성하고 발행합니다" />)
    expect(screen.getByText('초안을 작성하고 발행합니다')).toBeInTheDocument()
  })

  it('omits the description element when not given', () => {
    const { container } = render(<PageHeader title="방문 계획" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders actions', () => {
    render(<PageHeader title="방문 계획" actions={<button>새 계획</button>} />)
    expect(screen.getByRole('button', { name: '새 계획' })).toBeInTheDocument()
  })
})
