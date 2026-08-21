import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { SidebarNav } from './SidebarNav'
import { ROLE } from '@/constants/roles'
import type { UserRole } from '@/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

function renderNav(role: UserRole = ROLE.ADMIN, pendingTaskCount?: number, path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNav role={role} pendingTaskCount={pendingTaskCount} />
    </MemoryRouter>,
  )
}

describe('SidebarNav', () => {
  it('renders every label as visible text, not only as a tooltip', () => {
    renderNav()
    expect(screen.getByRole('link', { name: /nav.dashboard/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /nav.stats/ })).toBeInTheDocument()
  })

  it('groups admin screens under a section heading', () => {
    renderNav()
    expect(screen.getByText('nav.sectionAdmin')).toBeInTheDocument()
  })

  it('omits the section heading when a role has no admin screens', () => {
    renderNav(ROLE.PRESIDENT)
    expect(screen.queryByText('nav.sectionAdmin')).not.toBeInTheDocument()
  })

  // 스크린 리더가 "관리"를 외딴 문단으로만 읽지 않고, 그 아래 항목들을 하나의
  // 그룹으로 알리도록 role="group" + aria-labelledby로 묶는다.
  it('associates the admin heading with its items via a labelled group', () => {
    renderNav(ROLE.ADMIN)
    expect(screen.getByRole('group', { name: 'nav.sectionAdmin' })).toBeInTheDocument()
  })

  it('renders no group wrapper at all when a role has no admin screens', () => {
    renderNav(ROLE.PRESIDENT)
    expect(screen.queryByRole('group', { name: 'nav.sectionAdmin' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('marks the current route with aria-current', () => {
    renderNav(ROLE.ADMIN, undefined, '/admin/stats')
    expect(screen.getByRole('link', { name: /nav.stats/ })).toHaveAttribute('aria-current', 'page')
  })

  // NavLink는 기본이 접두사 매칭이라 to="/admin"이 /admin/stats에서도 활성이 된다.
  // 그대로 두면 관리 항목이 모든 관리 화면에서 같이 하이라이트된다.
  it('does not mark a parent path as current when a child route is active', () => {
    renderNav(ROLE.ADMIN, undefined, '/admin/stats')
    expect(screen.getByRole('link', { name: /nav.admin/ })).not.toHaveAttribute('aria-current')
  })

  it('shows the pending count on the badged item', () => {
    renderNav(ROLE.PRESIDENT, 3)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).toHaveTextContent('3')
  })

  it('omits the badge when the count is zero', () => {
    renderNav(ROLE.PRESIDENT, 0)
    expect(screen.getByRole('link', { name: /nav.tasks/ })).not.toHaveTextContent('0')
  })

  // 스펙 §3: 활성 표시는 배경 채움 + 글자 무게로만. 왼쪽 스트라이프 금지.
  // 직접 쓴 정규식은 border-left/inset 그림자만 봤고, 실제로 스트라이프를 그리는
  // 가장 흔한 방법인 ::before 색 바를 통째로 놓쳤다. 계획 1이 이미 만들어 둔
  // 공용 검사기를 쓴다 — 논리 속성과 의사 요소까지 본다.
  it('never marks the active item with a left accent stripe', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'Sidebar.module.scss'), 'utf8'))
  })
})
