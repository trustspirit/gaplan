import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { inviteUser } from '@/services/userService'
import { UserListCard } from './UserListCard'
import { InviteCard } from './InviteCard'

let users: unknown[] = []

beforeEach(() => {
  users = [
    { uid: 'u1', name: '홍길동', role: 'seventy', email: 'a@b.com' },
    { uid: 'u2', name: '김철수', role: 'president', email: 'c@d.com' },
  ]
  vi.mocked(inviteUser)
    .mockClear()
    .mockResolvedValue(undefined as never)
})

vi.mock('jotai', () => ({
  useAtomValue: () => ({ uid: 'a1', role: 'admin', name: '관리자' }),
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users, loading: false }) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/services/userService', () => ({
  inviteUser: vi.fn(),
  updateUserName: vi.fn(),
  updateUserRole: vi.fn(),
  updatePreRegisteredUserFields: vi.fn(),
  deleteUserAccount: vi.fn(),
  addPreRegisteredUser: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('user management', () => {
  it('lists every user', () => {
    render(<UserListCard />)
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('김철수')).toBeInTheDocument()
  })

  it('shows a skeleton instead of an empty list while loading', () => {
    users = []
    render(<UserListCard />)
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument()
  })

  it('invites the address that was typed', async () => {
    render(<InviteCard />)
    await userEvent.type(screen.getByLabelText('user.inviteEmail'), 'new@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'user.inviteSend' }))

    // inviteUser 는 객체가 아니라 위치 인자를 받는다:
    // (email, role, assignedRegionIds, invitedBy, assignedSeventyUid?, secondaryRole?, unitId?)
    // 기본 역할(president)에서는 지역/칠십인/보조역할/스테이크 인자가 정말로
    // undefined·null이라 expect.anything()으로는 매칭되지 않는다 — 값을 신경 쓰는
    // 두 인자(이메일, invitedBy)만 확인한다.
    expect(inviteUser).toHaveBeenCalled()
    const call = vi.mocked(inviteUser).mock.calls[0]
    expect(call[0]).toBe('new@test.com')
    expect(typeof call[1]).toBe('string')
    expect(call[3]).toBe('a1')
  })

  it('refuses to invite an empty address', async () => {
    render(<InviteCard />)
    await userEvent.click(screen.getByRole('button', { name: 'user.inviteSend' }))
    expect(inviteUser).not.toHaveBeenCalled()
  })
})
