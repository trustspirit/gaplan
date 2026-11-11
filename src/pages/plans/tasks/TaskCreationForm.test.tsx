import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppUser } from '@/types'
import { toast } from 'sonner'
import { createTask } from '@/services/taskService'
import { TaskCreationForm } from './TaskCreationForm'

const ADMIN = { uid: 'a1', role: 'admin', name: '관리자' } as AppUser
const SEVENTY = { uid: 'sv1', role: 'seventy', name: '칠십인' } as AppUser
const PRESIDENT = { uid: 'p1', role: 'president', name: '회장 하나', unitId: 'u1' } as AppUser

const onCreated = vi.fn()

beforeEach(() => {
  onCreated.mockClear()
  vi.mocked(createTask)
    .mockClear()
    .mockResolvedValue(undefined as never)
})

vi.mock('jotai', () => ({
  useAtomValue: () => ADMIN,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({ users: [ADMIN, SEVENTY, PRESIDENT] }),
}))
vi.mock('@/services/taskService', () => ({ createTask: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/domain/ProjectPicker/ProjectPicker', () => ({
  ProjectPicker: () => <div data-testid="project-picker" />,
}))

describe('TaskCreationForm', () => {
  it('starts on the interview type and offers a title field', () => {
    render(<TaskCreationForm />)
    expect(screen.getByRole('button', { name: 'task.type.select_interview' })).toBeInTheDocument()
    expect(screen.getByLabelText('task.title')).toBeInTheDocument()
  })

  // 방문 Task에는 제목이 없다 — 옛 화면의 조건부 렌더를 그대로 지킨다.
  it('drops the title field on the visit type', async () => {
    render(<TaskCreationForm />)
    await userEvent.click(screen.getByRole('button', { name: 'task.type.select_visit' }))
    expect(screen.queryByLabelText('task.title')).not.toBeInTheDocument()
  })

  // 조건이 안 맞을 때 버튼을 막아 두면 왜 안 되는지 알려줄 수 없다. 버튼은 열어 두고,
  // 누르면 빠진 것을 알려주되 Task는 만들지 않는다.
  it('says what is missing instead of disabling submit', async () => {
    render(<TaskCreationForm />)
    const submit = screen.getByRole('button', { name: /task\.create/ })
    expect(submit).toBeEnabled()
    await userEvent.click(submit)
    expect(toast.error).toHaveBeenCalledWith('common.selectPresident')
    expect(createTask).not.toHaveBeenCalled()
  })

  // 종류를 바꾸면 앞 종류에서 고른 날짜가 남아 있으면 안 된다 —
  // 방문은 일요일만, 접견은 아무 날이나라서 의미가 다르다.
  it('clears the chosen dates when the type changes', async () => {
    render(<TaskCreationForm />)

    // 날짜를 뺀 나머지 조건(회장, 칠십인)을 먼저 채워서 버튼이 날짜 유무에만
    // 좌우되게 만든다 — 그래야 날짜가 안 지워지면 이 테스트가 실패한다.
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.selectOptions(screen.getByLabelText('role.seventy'), SEVENTY.uid)

    const dayButtons = screen
      .getAllByRole('button')
      .filter(
        (btn) => /^\d{1,2}$/.test(btn.textContent ?? '') && !(btn as HTMLButtonElement).disabled,
      )
    await userEvent.click(dayButtons[0])
    await userEvent.click(screen.getByRole('button', { name: 'task.type.select_visit' }))

    // 날짜가 지워졌으면 제출이 "날짜를 고르라"고 막는다. 남아 있었다면 Task가 만들어진다.
    vi.mocked(toast.error).mockClear()
    await userEvent.click(screen.getByRole('button', { name: /task\.create/ }))
    expect(toast.error).toHaveBeenCalledWith('common.selectSunday')
    expect(createTask).not.toHaveBeenCalled()
  })
})
