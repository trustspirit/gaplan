import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders label, value, and unit', () => {
    render(<StatCard label="이번 달 방문" value={4} unit="건" />)
    expect(screen.getByText('이번 달 방문')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('건')).toBeInTheDocument()
  })

  it('renders the note when given', () => {
    render(<StatCard label="확정 대기 Task" value={3} note="가장 오래된 건 6일 경과" />)
    expect(screen.getByText('가장 오래된 건 6일 경과')).toBeInTheDocument()
  })

  it('renders children below the value', () => {
    render(
      <StatCard label="추이" value={4}>
        <div data-testid="spark" />
      </StatCard>,
    )
    expect(screen.getByTestId('spark')).toBeInTheDocument()
  })

  it('exposes the value and label as one accessible group', () => {
    render(<StatCard label="이번 달 방문" value={4} unit="건" />)
    expect(screen.getByRole('group', { name: /이번 달 방문/ })).toBeInTheDocument()
  })

  // 값이 바뀔 때 폭이 흔들리면 지표 레일이 덜컹거린다
  it('locks digit width', () => {
    const scss = readFileSync(resolve(__dirname, 'StatCard.module.scss'), 'utf8')
    expect(scss).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })
})
