import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DataList, type DataListRow } from './DataList'

const ROWS: DataListRow[] = [
  {
    id: 'a',
    lead: { primary: '24', secondary: '일' },
    title: '역삼 와드 방문',
    subtitle: '강남 스테이크 · 김성호 회장',
    meta: '09:00',
    tag: '방문',
    tagTone: 'accent',
  },
  {
    id: 'b',
    lead: { primary: '1', secondary: '12월 · 일' },
    title: '분당 와드 방문',
    meta: '09:00',
    tag: '방문',
  },
]

describe('DataList', () => {
  it('renders one list item per row', () => {
    render(<DataList rows={ROWS} aria-label="다가오는 일정" />)
    expect(screen.getByRole('list', { name: '다가오는 일정' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders lead, title, subtitle, meta, and tag', () => {
    render(<DataList rows={ROWS} aria-label="다가오는 일정" />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('역삼 와드 방문')).toBeInTheDocument()
    expect(screen.getByText('강남 스테이크 · 김성호 회장')).toBeInTheDocument()
    expect(screen.getAllByText('09:00')).toHaveLength(2)
    expect(screen.getAllByText('방문')).toHaveLength(2)
  })

  it('makes a row a button when it has onClick', async () => {
    const onClick = vi.fn()
    render(
      <DataList rows={[{ ...ROWS[0], onClick }]} aria-label="다가오는 일정" />,
    )
    await userEvent.click(screen.getByRole('button', { name: /역삼 와드 방문/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not render a button when the row is not clickable', () => {
    render(<DataList rows={ROWS} aria-label="다가오는 일정" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders row actions', () => {
    render(
      <DataList
        rows={[{ ...ROWS[0], actions: <button>수정</button> }]}
        aria-label="다가오는 일정"
      />,
    )
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
  })

  it('renders the footer', () => {
    render(<DataList rows={ROWS} aria-label="다가오는 일정" footer={<span>모두 보기</span>} />)
    expect(screen.getByText('모두 보기')).toBeInTheDocument()
  })

  // 스펙 §3: 행 앞의 색 막대 금지. 종류는 우측 라벨 하나로만 말한다
  it('never puts a color bar in front of a row', () => {
    const scss = readFileSync(resolve(__dirname, 'DataList.module.scss'), 'utf8')
    expect(scss).not.toMatch(/border-left:\s*[2-9]/)
    expect(scss).not.toMatch(/box-shadow:\s*inset\s+[2-9]/)
  })

  it('locks digit width on the meta column', () => {
    const scss = readFileSync(resolve(__dirname, 'DataList.module.scss'), 'utf8')
    expect(scss).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })
})
