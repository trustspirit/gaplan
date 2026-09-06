import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import type { AppUser, Schedule } from '@/types'
import { getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { AdminHome } from './AdminHome'

const ADMIN = { uid: 'a1', role: 'admin', name: '관리자' } as AppUser
const NOW = dayjs()

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: NOW.add(3, 'day').format('YYYY-MM-DD'),
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'a1',
    ...over,
  } as Schedule
}

let schedules: Schedule[] = []
let publicSettings: Record<string, unknown> = {}
const navigateMock = vi.fn()

beforeEach(() => {
  schedules = [schedule()]
  publicSettings = {}
  navigateMock.mockClear()
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
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
vi.mock('@/hooks/useSchedules', () => ({ useSchedules: () => ({ schedules, loading: false }) }))
vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => ({ getUnitName: (id: string) => id, getWardName: (id: string) => id }),
}))
vi.mock('@/hooks/useDeleteWithUndo', () => ({
  useDeleteWithUndo: () => ({ pendingIds: new Set<string>(), scheduleDelete: vi.fn() }),
}))
// SeventyHome.test.tsx와 같은 이유 — ScheduleItem 안의 useIsMobile이
// jsdom에 없는 window.matchMedia를 부른다.
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ data: () => publicSettings })),
}))
vi.mock('@/firebase', () => ({ db: {} }))
vi.mock('@/services/scheduleService', () => ({ deleteScheduleViaCF: vi.fn() }))
// 두 모달은 열렸는지만 본다. 진짜로 끌어오면 firebase functions까지 딸려 오고,
// 그 안쪽은 각 모달의 제 테스트가 이미 본다. AddScheduleFlow는 admin에게 chooser를
// 먼저 여니, 여기서는 페이지가 그 흐름을 실제로 붙였는지만 확인한다.
vi.mock('@/components/domain/addSchedule/AddScheduleFlow', () => ({
  AddScheduleFlow: () => <div data-testid="schedule-form" />,
}))
vi.mock('@/components/domain/EditScheduleModal/EditScheduleModal', () => ({
  EditScheduleModal: ({ schedule }: { schedule: Schedule }) => (
    <div data-testid="edit-modal">{schedule.id}</div>
  ),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

describe('AdminHome', () => {
  it('lists the upcoming schedules with both actions', () => {
    render(<AdminHome />)
    expect(screen.getByText('schedule.upcoming')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /common.publicLink/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /common.add/ })).toBeInTheDocument()
  })

  // 경로 리터럴이 화면에 남아 있지 않다는 것을 고정한다 — 계획 3이 세운 규칙이다.
  it('sends an admin without a public link to the calendar settings route', async () => {
    render(<AdminHome />)
    await userEvent.click(screen.getByRole('button', { name: /common.publicLink/ }))
    expect(navigateMock).toHaveBeenCalledWith('/settings/sharing')
  })

  it('opens the schedule form from the new-schedule action', async () => {
    render(<AdminHome />)
    await userEvent.click(screen.getByRole('button', { name: /common.add/ }))
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument()
  })

  // 공개 일정이 켜져 있어도 토큰이 없으면 복사할 링크가 없다 — 설정으로 보낸다.
  it('sends an admin to the settings when the public schedule has no token yet', async () => {
    publicSettings = { schedulePublic: true }
    render(<AdminHome />)
    await userEvent.click(await screen.findByRole('button', { name: /common.publicLink/ }))

    expect(toast.info).toHaveBeenCalledWith('common.publicLinkMissing')
    expect(navigateMock).toHaveBeenCalledWith('/settings/sharing')
  })

  it('copies the public link instead of navigating once a token exists', async () => {
    publicSettings = { schedulePublic: true, globalToken: 'tok123' }
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<AdminHome />)
    // 설정을 읽어 온 뒤라야 복사 갈래로 간다.
    await waitFor(() => expect(getDoc).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: /common.publicLink/ }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/public/schedule/tok123`),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  // 판정 R41 — 홈에 지표 타일을 두지 않는다.
  it('draws no stat tiles', () => {
    render(<AdminHome />)
    expect(screen.queryAllByRole('group')).toHaveLength(0)
  })
})

// 맨 위 「다음 일정」 카드는 목록에서 그 한 건을 빼내 올린 것이다 — 같은 일정이
// 카드와 목록 양쪽에 보이면 훑는 눈이 그 자리에서 한 번 멈춘다.
describe('AdminHome 다음 일정 카드', () => {
  it('가장 가까운 일정을 카드로 올리고 아래 목록에서는 뺀다', async () => {
    schedules = [
      schedule({ id: 'soon', customTitle: '가까운 접견', date: NOW.add(1, 'day').format('YYYY-MM-DD') }),
      schedule({ id: 'later', customTitle: '나중 접견', date: NOW.add(6, 'day').format('YYYY-MM-DD') }),
    ]
    render(<AdminHome />)

    await waitFor(() => expect(screen.getByText('home.nextUp')).toBeInTheDocument())

    // 가까운 건은 카드에 딱 한 번(목록에서 빠졌으므로), 나중 건은 목록에 한 번.
    expect(screen.getAllByText('가까운 접견')).toHaveLength(1)
    expect(screen.getAllByText('나중 접견')).toHaveLength(1)
  })

  it('보여줄 일정이 없으면 카드를 그리지 않는다', async () => {
    schedules = []
    render(<AdminHome />)

    await waitFor(() => expect(screen.getByText('schedule.noUpcoming')).toBeInTheDocument())
    expect(screen.queryByText('home.nextUp')).not.toBeInTheDocument()
  })

  it('목록을 날짜 그룹으로 묶는다', async () => {
    schedules = [
      schedule({ id: 'a', date: NOW.add(1, 'day').format('YYYY-MM-DD') }),
      schedule({ id: 'b', date: NOW.add(2, 'day').format('YYYY-MM-DD') }),
    ]
    render(<AdminHome />)

    // a는 카드로 빠지고 b만 목록에 남는다 — 그 b가 그룹 헤더 아래 놓인다.
    await waitFor(() => expect(screen.getByText('home.nextUp')).toBeInTheDocument())
    const headers = screen.queryAllByText(
      /schedule\.group(Today|Tomorrow|ThisWeek|Later)/,
    )
    expect(headers.length).toBeGreaterThan(0)
  })
})
