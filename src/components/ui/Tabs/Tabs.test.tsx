import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Tabs } from './Tabs'

const ITEMS = [
  { id: 'plans', label: '방문 계획' },
  { id: 'tasks', label: 'Task', count: 3 },
  { id: 'projects', label: '프로젝트' },
]

describe('Tabs', () => {
  it('renders a tablist with one tab per item', () => {
    render(<Tabs items={ITEMS} activeId="plans" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tablist', { name: '계획 탭' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('marks the active tab as selected', () => {
    render(<Tabs items={ITEMS} activeId="tasks" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Task')
  })

  it('reports the selected id', async () => {
    const onSelect = vi.fn()
    render(<Tabs items={ITEMS} activeId="plans" onSelect={onSelect} aria-label="계획 탭" />)
    await userEvent.click(screen.getByRole('tab', { name: /프로젝트/ }))
    expect(onSelect).toHaveBeenCalledWith('projects')
  })

  it('shows the count next to the label', () => {
    render(<Tabs items={ITEMS} activeId="plans" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tab', { name: 'Task 3' })).toBeInTheDocument()
  })

  it('keeps only the active tab in the tab order', () => {
    render(<Tabs items={ITEMS} activeId="tasks" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tab', { name: /Task/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: '방문 계획' })).toHaveAttribute('tabindex', '-1')
  })

  it('uses renderLink for items that have an href', () => {
    render(
      <Tabs
        items={[{ id: 'visits', label: '방문', href: '/schedules/visits' }]}
        activeId="visits"
        renderLink={(item, children, className) => (
          <a href={item.href} className={className} role="tab" aria-selected>
            {children}
          </a>
        )}
        aria-label="일정 탭"
      />,
    )
    expect(screen.getByRole('tab', { name: '방문' })).toHaveAttribute('href', '/schedules/visits')
  })

  // 활성 표시는 밑줄과 글자 무게로. 왼쪽 스트라이프 금지 (스펙 §3)
  it('never uses a left accent stripe', () => {
    const scss = readFileSync(resolve(__dirname, 'Tabs.module.scss'), 'utf8')
    expect(scss).not.toMatch(/border-left:\s*[2-9]/)
    expect(scss).not.toMatch(/box-shadow:\s*inset\s+[2-9]/)
  })
})
