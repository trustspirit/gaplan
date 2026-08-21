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

function renderNav(role: UserRole = ROLE.ADMIN, pendingTaskCount?: number, path = '/home') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNav role={role} pendingTaskCount={pendingTaskCount} />
    </MemoryRouter>,
  )
}

describe('SidebarNav', () => {
  it('renders every label as visible text, not only as a tooltip', () => {
    renderNav()
    expect(screen.getByRole('link', { name: /nav.home/ })).toBeInTheDocument()
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

  // 판정 R47 — 계정 항목은 main 섹션에 둔다. admin으로 두면 회장·칠십인에게
  // "내 계정" 하나짜리 관리 그룹 헤딩이 뜨는데, 스펙 §4.2가 이들에게 관리 구역을
  // 아예 주지 않기 때문에 그건 거짓 표시가 된다.
  it('gives the account item no admin heading even though its section-mate list is empty for the same role', () => {
    renderNav(ROLE.PRESIDENT)
    expect(screen.getByRole('link', { name: /nav.account/ })).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  // 승인 대기는 항목이 아예 없는 유일한 역할이다 — 위 두 president 테스트와는
  // 별개로, "항목이 하나도 없을 때도 그룹이 없다"를 따로 고정해 둔다.
  it('renders nothing at all for a role with no nav items', () => {
    renderNav(ROLE.PENDING)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('marks the current route with aria-current', () => {
    renderNav(ROLE.ADMIN, undefined, '/stats')
    expect(screen.getByRole('link', { name: /nav.stats/ })).toHaveAttribute('aria-current', 'page')
  })

  // 통계·주소록이 /admin/ 밖으로 나가면서 설정('/settings') 아래에는 네비 항목이
  // 하나도 남지 않았다. 겹쳐 켜질 상대가 없으니 접두사 매칭이 그대로 맞는 답이 된다
  // — 사용자 관리 화면에서 설정이 켜져 있는 것이 지금 어디인지 알려 준다.
  it('keeps the settings item current on the screens that live under it', () => {
    renderNav(ROLE.ADMIN, undefined, '/settings/system')
    const current = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('aria-current') === 'page')
    expect(current.map((el) => el.textContent)).toEqual(['nav.settings'])
  })

  it('shows the pending count on the badged item', () => {
    renderNav(ROLE.PRESIDENT, 3)
    expect(screen.getByRole('link', { name: /nav.home/ })).toHaveTextContent('3')
  })

  it('omits the badge when the count is zero', () => {
    renderNav(ROLE.PRESIDENT, 0)
    expect(screen.getByRole('link', { name: /nav.home/ })).not.toHaveTextContent('0')
  })

  // 숫자만 있으면 스크린리더는 "Task 3"이라고만 읽는다 — 3이 무엇의 3인지 없다.
  // MobileTabs.test.tsx가 이미 거는 것과 같은 단언을 데스크톱에도 건다.
  it('announces what the badge number counts, not just the number', () => {
    renderNav(ROLE.PRESIDENT, 3)
    expect(screen.getByRole('link', { name: /nav.home/ })).toHaveAccessibleName(/task.pendingCount/)
  })

  it('does not announce a pending count when there is nothing pending', () => {
    renderNav(ROLE.PRESIDENT, 0)
    expect(screen.getByRole('link', { name: /nav.home/ })).not.toHaveAccessibleName(
      /task.pendingCount/,
    )
  })

  it('names the navigation landmark', () => {
    renderNav()
    expect(screen.getByRole('navigation', { name: 'nav.primaryLabel' })).toBeInTheDocument()
  })

  // 스펙 §3: 활성 표시는 배경 채움 + 글자 무게로만. 왼쪽 스트라이프 금지.
  // 직접 쓴 정규식은 border-left/inset 그림자만 봤고, 실제로 스트라이프를 그리는
  // 가장 흔한 방법인 ::before 색 바를 통째로 놓쳤다. 계획 1이 이미 만들어 둔
  // 공용 검사기를 쓴다 — 논리 속성과 의사 요소까지 본다.
  it('never marks the active item with a left accent stripe', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'Sidebar.module.scss'), 'utf8'))
  })
})
