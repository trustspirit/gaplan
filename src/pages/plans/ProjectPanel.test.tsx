import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AppUser, Project } from '@/types'
import { createProject, updateProject } from '@/services/projectService'
import { ProjectPanel } from './ProjectPanel'

const ADMIN: AppUser = {
  uid: 'a1',
  role: 'admin',
  name: '관리자',
  email: 'a@b.com',
  createdAt: '2026-01-01',
} as AppUser

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'j1',
    title: '가을 대회',
    notes: '',
    status: 'active',
    createdBy: 'a1',
    createdAt: '2026-02-01',
    ...over,
  } as Project
}

let projects: Project[] = []
let loading = false
const navigateMock = vi.fn()

beforeEach(() => {
  projects = []
  loading = false
  navigateMock.mockClear()
  vi.mocked(createProject)
    .mockClear()
    .mockResolvedValue(undefined as never)
  vi.mocked(updateProject)
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
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects, loading }) }))
vi.mock('@/services/projectService', () => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

describe('ProjectPanel', () => {
  it('shows a skeleton while the projects load', () => {
    loading = true
    render(<ProjectPanel />)
    expect(screen.getByRole('status', { name: 'common.loading' })).toBeInTheDocument()
  })

  it('shows an empty state when there are no projects', () => {
    render(<ProjectPanel />)
    expect(screen.getByText('project.empty')).toBeInTheDocument()
  })

  it('opens a project at its new path', async () => {
    projects = [project({ id: 'j9' })]
    render(<ProjectPanel />)
    await userEvent.click(screen.getByText('가을 대회'))
    expect(navigateMock).toHaveBeenCalledWith('/plans/projects/j9')
  })

  it('clears the form after a successful create', async () => {
    render(<ProjectPanel />)
    const title = screen.getByLabelText('project.titleLabel')
    await userEvent.type(title, '겨울 대회')
    await userEvent.click(screen.getByRole('button', { name: 'project.create' }))

    expect(createProject).toHaveBeenCalledWith('겨울 대회', '', 'a1')
    expect(title).toHaveValue('')
  })

  // 모든 행의 셀렉트가 같은 접근성 이름을 갖고 있던 버그를 고정한다.
  it('names the status select by what it does, not by one of its values', () => {
    projects = [project()]
    render(<ProjectPanel />)
    expect(screen.getByRole('combobox', { name: 'project.statusLabel' })).toBeInTheDocument()
  })

  it('saves a status change', async () => {
    projects = [project({ id: 'j9' })]
    render(<ProjectPanel />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'project.statusLabel' }),
      'done',
    )
    expect(updateProject).toHaveBeenCalledWith('j9', { status: 'done' })
  })
})
