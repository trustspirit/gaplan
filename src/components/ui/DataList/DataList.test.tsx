import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '../testing/bannedPatterns'
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
    render(<DataList rows={[{ ...ROWS[0], onClick }]} aria-label="다가오는 일정" />)
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

  // 행 버튼과 액션 버튼이 중첩되면(버튼 속 버튼) 유효하지 않은 HTML이 되고
  // 터치 환경에서 둘 다 탭할 수 없게 된다. actions는 항상 클릭 영역 밖의
  // 형제 요소여야 하므로, 구조와 이벤트 분리를 함께 검증한다.
  it('keeps row actions structurally separate from a clickable row', async () => {
    const onClick = vi.fn()
    const onActionClick = vi.fn()
    render(
      <DataList
        rows={[{ ...ROWS[0], onClick, actions: <button onClick={onActionClick}>수정</button> }]}
        aria-label="다가오는 일정"
      />,
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    const rowButton = screen.getByRole('button', { name: /역삼 와드 방문/ })
    const actionButton = screen.getByRole('button', { name: '수정' })
    expect(rowButton.contains(actionButton)).toBe(false)

    await userEvent.click(actionButton)
    expect(onActionClick).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders the footer', () => {
    render(<DataList rows={ROWS} aria-label="다가오는 일정" footer={<span>모두 보기</span>} />)
    expect(screen.getByText('모두 보기')).toBeInTheDocument()
  })

  // dimmed and highlighted are opposite mechanisms (mute text vs. fill
  // background), so they must be independent classes, not the same field.
  it('marks a dimmed row with its own class, independent of highlighted', () => {
    render(
      <DataList
        rows={[
          { ...ROWS[0], dimmed: true },
          { ...ROWS[1], highlighted: true },
        ]}
        aria-label="다가오는 일정"
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0].className).toMatch(/dimmed/)
    expect(items[0].className).not.toMatch(/highlighted/)
    expect(items[1].className).toMatch(/highlighted/)
    expect(items[1].className).not.toMatch(/dimmed/)
  })

  // 스펙 §3: 행 앞의 색 막대 금지. 종류는 우측 라벨 하나로만 말한다
  it('never puts a color bar in front of a row', () => {
    const scss = readFileSync(resolve(__dirname, 'DataList.module.scss'), 'utf8')
    expectNoAccentStripe(scss)
  })

  it('locks digit width on the meta column', () => {
    const scss = readFileSync(resolve(__dirname, 'DataList.module.scss'), 'utf8')
    expect(scss).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  // 색 막대를 없앤 대신, 우측 tag가 종류를 전달하는 유일한 채널이다. 클릭
  // 가능한 행의 접근 가능한 이름을 줄이면(예: subtitle이나 tag 생략)
  // 스크린리더 사용자에게서 그 정보가 사라진다. 이 테스트는 향후 "이름이
  // 너무 길다"는 이유로 축약하는 변경을 막기 위해 존재한다.
  it('keeps title, subtitle, and tag in the clickable row accessible name', () => {
    const onClick = vi.fn()
    // tag는 '접견'으로 덮어써서 title('역삼 와드 방문')·subtitle('강남
    // 스테이크 · 김성호 회장')·lead·meta 어디에도 겹치는 부분 문자열이 없도록
    // 한다. tag가 이름에서 사라져도 title만으로 만족되는 검증은 무의미하다.
    render(<DataList rows={[{ ...ROWS[0], onClick, tag: '접견' }]} aria-label="다가오는 일정" />)
    const rowButton = screen.getByRole('button')
    expect(rowButton).toHaveAccessibleName(/역삼 와드 방문/)
    expect(rowButton).toHaveAccessibleName(/강남 스테이크/)
    expect(rowButton).toHaveAccessibleName(/접견/)
  })
})
