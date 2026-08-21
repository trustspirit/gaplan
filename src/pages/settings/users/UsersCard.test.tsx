import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import {
  inviteUser,
  deleteUserAccount,
  deletePreRegisteredUser,
  addPreRegisteredUser,
} from '@/services/userService'
import { UserListCard } from './UserListCard'
import { InviteCard } from './InviteCard'
import { PreRegisterCard } from './PreRegisterCard'

let users: unknown[] = []
let loading = false

beforeEach(() => {
  users = [
    { uid: 'u1', name: '홍길동', role: 'seventy', email: 'a@b.com' },
    { uid: 'u2', name: '김철수', role: 'president', email: 'c@d.com' },
  ]
  loading = false
  vi.mocked(inviteUser)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(deleteUserAccount)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(deletePreRegisteredUser)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(addPreRegisteredUser)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(toast.error).mockClear()
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
vi.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users, loading }) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('@/services/userService', () => ({
  inviteUser: vi.fn(),
  updateUserName: vi.fn(),
  updateUserRole: vi.fn(),
  updatePreRegisteredUserFields: vi.fn(),
  deleteUserAccount: vi.fn(),
  deletePreRegisteredUser: vi.fn(),
  addPreRegisteredUser: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  // Skeleton은 클래스만 있는 빈 div라 텍스트/role로 찾을 수 없다 — 로딩 테스트에서만
  // 식별 가능하도록 표식을 붙인다. TaskPanel.test.tsx가 쓰는 것과 같은 패턴.
  return { ...actual, Skeleton: () => <div data-testid="user-skeleton" /> }
})

describe('user management', () => {
  it('lists every user', () => {
    render(<UserListCard />)
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('김철수')).toBeInTheDocument()
  })

  it('shows a skeleton instead of an empty list while loading', () => {
    users = []
    loading = true
    render(<UserListCard />)
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('user-skeleton')).toHaveLength(3)
  })

  it('shows real rows, not skeletons, once loading finishes', () => {
    loading = false
    render(<UserListCard />)
    expect(screen.queryByTestId('user-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('홍길동')).toBeInTheDocument()
  })

  it('invites the address that was typed', async () => {
    render(<InviteCard />)
    await userEvent.type(screen.getByLabelText('user.inviteEmail'), 'new@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'user.inviteSend' }))

    // inviteUser 는 객체가 아니라 위치 인자를 받는다:
    // (email, role, assignedRegionIds, invitedBy, assignedSeventyUid?, secondaryRole?, unitId?)
    // 기본 역할(president)에서는 지역/칠십인/보조역할/스테이크 인자가 실제로
    // undefined·null이다 — 값을 그대로 확인한다 (검증된 값, 추측 아님).
    expect(inviteUser).toHaveBeenCalledWith(
      'new@test.com',
      'president',
      undefined,
      'a1',
      undefined,
      null,
      undefined,
    )
  })

  it('refuses to invite an empty address', async () => {
    render(<InviteCard />)
    await userEvent.click(screen.getByRole('button', { name: 'user.inviteSend' }))
    expect(inviteUser).not.toHaveBeenCalled()
  })

  it('deletes a live user through deleteUserAccount, not deletePreRegisteredUser', async () => {
    users = [{ uid: 'u1', name: '홍길동', role: 'seventy', email: 'a@b.com' }]
    render(<UserListCard />)

    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'common.delete' }))

    expect(deleteUserAccount).toHaveBeenCalledWith('u1')
    expect(deletePreRegisteredUser).not.toHaveBeenCalled()
  })

  it('deletes a pre-registered user through deletePreRegisteredUser, not deleteUserAccount', async () => {
    users = [
      { uid: 'u2', name: '김철수', role: 'president', email: 'c@d.com', preRegistered: true },
    ]
    render(<UserListCard />)

    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'common.delete' }))

    expect(deletePreRegisteredUser).toHaveBeenCalledWith('u2')
    expect(deleteUserAccount).not.toHaveBeenCalled()
  })
})

// fix round 2 — PreRegisterCard.tsx는 리뷰 1차에서 지적됐던 유일한 미커버 파일이다.
// handlePreRegister의 가드 절과 역할별 필드 스프레드를 여기서 고정한다.
describe('PreRegisterCard', () => {
  it('submits with the exact fields the component builds — president role, unit selected, whitespace trimmed', async () => {
    render(<PreRegisterCard />)
    await userEvent.type(screen.getByLabelText('user.name'), '  박선희  ')
    await userEvent.type(screen.getByLabelText('user.preRegEmail'), '  sh@test.com  ')
    await userEvent.selectOptions(screen.getByLabelText('user.preRegUnit'), 'seoul-stake')
    await userEvent.click(screen.getByRole('button', { name: 'user.preRegSubmit' }))

    // 기본 역할은 'president'다 — 역할 선택을 건드릴 필요가 없다.
    expect(addPreRegisteredUser).toHaveBeenCalledWith({
      name: '박선희',
      email: 'sh@test.com',
      role: 'president',
      unitId: 'seoul-stake',
    })
  })

  it('submits with region fields when the role is seventy, and omits unitId — the other side of the same branch', async () => {
    render(<PreRegisterCard />)
    await userEvent.type(screen.getByLabelText('user.name'), '이지역')
    await userEvent.selectOptions(screen.getByLabelText('user.role'), 'seventy')
    await userEvent.click(screen.getByRole('checkbox', { name: '서울 CC' }))
    await userEvent.click(screen.getByRole('button', { name: 'user.preRegSubmit' }))

    expect(addPreRegisteredUser).toHaveBeenCalledWith({
      name: '이지역',
      email: '',
      role: 'seventy',
      regionIds: ['seoul'],
      regionId: 'seoul',
    })
  })

  it('blocks the submission when exec_secretary has no assigned seventy, and calls no service', async () => {
    render(<PreRegisterCard />)
    await userEvent.type(screen.getByLabelText('user.name'), '경비서기')
    await userEvent.selectOptions(screen.getByLabelText('user.role'), 'exec_secretary')
    await userEvent.click(screen.getByRole('button', { name: 'user.preRegSubmit' }))

    expect(toast.error).toHaveBeenCalledWith('user.preRegExecSecretaryNeedsSeventy')
    expect(addPreRegisteredUser).not.toHaveBeenCalled()
  })
})
