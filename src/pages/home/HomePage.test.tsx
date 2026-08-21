import { render, screen } from '@testing-library/react'
import type { AppUser } from '@/types'
import { ROLE } from '@/constants/roles'
import { HomePage } from './HomePage'

let currentUser: AppUser = { uid: 'a1', role: ROLE.ADMIN, name: '관리자' } as AppUser

beforeEach(() => {
  currentUser = { uid: 'a1', role: ROLE.ADMIN, name: '관리자' } as AppUser
})

vi.mock('jotai', () => ({
  useAtomValue: () => currentUser,
  useSetAtom: () => vi.fn(),
  atom: vi.fn(),
}))
vi.mock('./PresidentHome', () => ({ PresidentHome: () => <div data-testid="home-president" /> }))
vi.mock('./SeventyHome', () => ({ SeventyHome: () => <div data-testid="home-seventy" /> }))
vi.mock('./AdminHome', () => ({ AdminHome: () => <div data-testid="home-admin" /> }))

describe('HomePage', () => {
  it('gives the admin the admin home', () => {
    render(<HomePage />)
    expect(screen.getByTestId('home-admin')).toBeInTheDocument()
  })

  it('gives the exec secretary the admin home', () => {
    currentUser = { uid: 'e1', role: ROLE.EXEC_SECRETARY, name: '집행서기' } as AppUser
    render(<HomePage />)
    expect(screen.getByTestId('home-admin')).toBeInTheDocument()
  })

  it('gives the seventy the seventy home', () => {
    currentUser = { uid: 'sv1', role: ROLE.SEVENTY, name: '칠십인' } as AppUser
    render(<HomePage />)
    expect(screen.getByTestId('home-seventy')).toBeInTheDocument()
  })

  it('gives the president the president home', () => {
    currentUser = { uid: 'p1', role: ROLE.PRESIDENT, name: '회장' } as AppUser
    render(<HomePage />)
    expect(screen.getByTestId('home-president')).toBeInTheDocument()
  })
})
