import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import {
  updateUserName,
  updateUserRole,
  updatePreRegisteredUserFields,
} from '@/services/userService'
import type { AppUser } from '@/types'
import { EditUserModal } from './EditUserModal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useUsers', () => ({ useUsers: () => ({ users: [], loading: false }) }))
vi.mock('@/services/userService', () => ({
  updateUserName: vi.fn().mockResolvedValue(undefined),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  updatePreRegisteredUserFields: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

beforeEach(() => {
  vi.mocked(updateUserName).mockClear()
  vi.mocked(updateUserRole).mockClear()
  vi.mocked(updatePreRegisteredUserFields).mockClear()
  vi.mocked(toast.error).mockClear()
})

// EditUserModal.handleSave는 UserManagement.tsx에서 가장 밀도 높은 로직이었다
// (여러 독립적인 변경-감지 불리언과 두 개의 가드 절) — 분해 리뷰 1차에서 지적된
// 테스트 공백을 여기서 메운다.
describe('EditUserModal', () => {
  it('editing only the name calls updateUserName and not updateUserRole', async () => {
    const user = {
      uid: 'u1',
      name: '홍길동',
      role: 'seventy',
      email: 'a@b.com',
      regionIds: ['seoul'],
      createdAt: '',
    } as AppUser
    render(<EditUserModal user={user} onClose={vi.fn()} />)

    const nameInput = screen.getByLabelText('user.name')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, '홍길순')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(updateUserName).toHaveBeenCalledWith('u1', '홍길순')
    expect(updateUserRole).not.toHaveBeenCalled()
  })

  it('editing the role calls updateUserRole with the right arguments', async () => {
    const user = {
      uid: 'u2',
      name: '김철수',
      role: 'president',
      email: 'c@d.com',
      createdAt: '',
    } as AppUser
    render(<EditUserModal user={user} onClose={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('user.role'), 'admin')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    // (uid, role, assignedRegionIds, assignedSeventyUid, secondaryRole, unitId) —
    // admin으로 바뀌었지만 보조 역할은 그대로 null이라 뒤 네 인자는 undefined/null이다.
    expect(updateUserRole).toHaveBeenCalledWith(
      'u2',
      'admin',
      undefined,
      undefined,
      null,
      undefined,
    )
    expect(updateUserName).not.toHaveBeenCalled()
  })

  it("a pre-registered user's edit routes through updatePreRegisteredUserFields, not the live-user path", async () => {
    const user = {
      uid: 'u3',
      name: '이영희',
      role: 'seventy',
      email: 'old@test.com',
      regionIds: ['seoul'],
      preRegistered: true,
      createdAt: '',
    } as AppUser
    render(<EditUserModal user={user} onClose={vi.fn()} />)

    const emailInput = screen.getByLabelText('user.preRegEmail')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'new@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(updatePreRegisteredUserFields).toHaveBeenCalledWith('u3', { email: 'new@test.com' })
    expect(updateUserRole).not.toHaveBeenCalled()
    expect(updateUserName).not.toHaveBeenCalled()
  })

  it('saving with nothing changed calls no service at all', async () => {
    const user = {
      uid: 'u4',
      name: '박민수',
      role: 'president',
      email: 'p@test.com',
      createdAt: '',
    } as AppUser
    render(<EditUserModal user={user} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(updateUserName).not.toHaveBeenCalled()
    expect(updateUserRole).not.toHaveBeenCalled()
    expect(updatePreRegisteredUserFields).not.toHaveBeenCalled()
  })

  it('blocks the save when exec_secretary has no assigned seventy', async () => {
    const user = {
      uid: 'u5',
      name: 'guard1',
      role: 'exec_secretary',
      email: 'g1@test.com',
      createdAt: '',
    } as AppUser
    render(<EditUserModal user={user} onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(toast.error).toHaveBeenCalledWith('user.editExecSecretaryNeedsSeventy')
    expect(updateUserName).not.toHaveBeenCalled()
    expect(updateUserRole).not.toHaveBeenCalled()
  })

  it('blocks the save when the admin secondary exec_secretary role has no assigned seventy', async () => {
    const user = {
      uid: 'u6',
      name: 'guard2',
      role: 'admin',
      email: 'g2@test.com',
      createdAt: '',
    } as AppUser
    render(<EditUserModal user={user} onClose={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('user.secondaryRole'), 'exec_secretary')
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }))

    expect(toast.error).toHaveBeenCalledWith('user.secondaryExecSecretaryNeedsSeventy')
    expect(updateUserRole).not.toHaveBeenCalled()
  })
})
