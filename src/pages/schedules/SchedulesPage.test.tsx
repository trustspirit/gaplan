import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import type { GeneralSchedule, Schedule } from '@/types'
import { deleteGeneralSchedule } from '@/services/generalScheduleService'
import { downloadCsv, rowsToCsv } from './scheduleCsv'
import { SchedulesPage } from './SchedulesPage'

const ADMIN = {
  uid: 'a1',
  role: 'admin',
  name: '관리자',
  email: 'a@b.com',
  createdAt: '2026-01-01',
}

// 실제 오늘로부터 상대적으로 잡는다 — 페이지가 today를 dayjs()로 직접 계산해서
// (ScheduleListPanel과 달리) 테스트에 주입할 길이 없다. 절대 날짜를 쓰면 시간이
// 지날수록 "지난 일정"이 "예정"으로 뒤집힌다.
const NOW = dayjs()
const PAST = NOW.subtract(30, 'day').format('YYYY-MM-DD')
const PAST2 = NOW.subtract(20, 'day').format('YYYY-MM-DD')
const FUTURE = NOW.add(30, 'day').format('YYYY-MM-DD')

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: '2026-03-10',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'a1',
    ...over,
  }
}

function event(over: Partial<GeneralSchedule> = {}): GeneralSchedule {
  return {
    id: 'ev1',
    title: '컨퍼런스',
    date: '2026-03-10',
    category: 'conference',
    createdBy: 'a1',
    createdAt: '2026-01-01',
    isPublic: true,
    ...over,
  }
}

function defaultSchedules(): Schedule[] {
  return [
    schedule({ id: 'visit', type: 'ward_visit' }),
    schedule({ id: 'talk', type: 'interview', date: '2026-03-12' }),
  ]
}

// let로 둬서 각 테스트가 자기 데이터를 심을 수 있게 한다. mock 팩토리는 클로저로
// 이 변수를 참조하므로, 실제로 훅이 불리는 시점(렌더 시점)의 값을 읽는다 —
// beforeEach가 먼저 돌고 나서 render()가 불리므로 타이밍 문제가 없다.
let schedules: Schedule[] = defaultSchedules()
let generalSchedules: GeneralSchedule[] = []
const scheduleDeleteMock = vi.fn()

beforeEach(() => {
  schedules = defaultSchedules()
  generalSchedules = []
  scheduleDeleteMock.mockClear()
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
vi.mock('@/hooks/useTopBar', () => ({ useTopBar: vi.fn() }))
vi.mock('@/hooks/useSchedules', () => ({
  useSchedules: () => ({ schedules, loading: false, error: null }),
}))
vi.mock('@/hooks/useGeneralSchedules', () => ({
  useGeneralSchedules: () => ({
    generalSchedules,
    allGeneralSchedules: generalSchedules,
    loading: false,
  }),
}))
vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => ({ getUnitName: (id: string) => id, getWardName: (n: string) => n }),
}))
vi.mock('@/hooks/useScheduleDateRange', () => ({
  useScheduleDateRange: () => ({
    setting: { preset: 'rolling' },
    range: { start: '2020-01-01', end: '2030-12-31' },
    loading: false,
    save: vi.fn(),
  }),
}))
vi.mock('@/hooks/useDeleteWithUndo', () => ({
  useDeleteWithUndo: () => ({ pendingIds: new Set(), scheduleDelete: scheduleDeleteMock }),
}))
vi.mock('@/hooks/useEffectiveScope', () => ({
  useEffectiveScope: () => ({ regionIds: null, actingSeventyUid: null }),
}))

// 서비스 모듈은 import만으로 src/firebase.ts를 평가한다 — getAuth/getFirestore가
// 즉시 돌아서 jsdom에서 터진다. 저장소의 다른 페이지 테스트(TaskProgress.test.tsx)와
// 같은 이유로 서비스와 sonner를 함께 막는다.
vi.mock('@/services/scheduleService', () => ({
  manualCalendarSync: vi.fn(async () => ({ message: 'ok' })),
  deleteScheduleViaCF: vi.fn(async () => {}),
}))
vi.mock('@/services/generalScheduleService', () => ({
  registerAttendance: vi.fn(async () => {}),
  cancelAttendance: vi.fn(async () => {}),
  updateGeneralSchedule: vi.fn(async () => {}),
  deleteGeneralSchedule: vi.fn(async () => {}),
}))
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

// CSV 배선(Important 2 #4) — rowsToCsv/downloadCsv를 거치는지 본다. 직접
// 따옴표 로직을 다시 심으면 formula-injection 방어가 조용히 사라지므로, 이
// 모듈을 우회하지 않는다는 것만 지킨다.
vi.mock('./scheduleCsv', () => ({
  rowsToCsv: vi.fn(() => 'CSV_ROWS'),
  downloadCsv: vi.fn(),
}))

// 달력 격자는 자체 테스트를 갖고 있지만, 여기서는 지역 필터가 격자까지
// 닿는지(Important 1) 봐야 하므로 받은 schedules id를 data attribute로 드러낸다.
vi.mock('@/components/domain/CalendarView/CalendarView', () => ({
  CalendarView: ({
    view,
    schedules: gridSchedules,
  }: {
    view?: string
    schedules?: { id: string }[]
  }) => (
    <div
      data-testid="calendar"
      data-schedule-ids={(gridSchedules ?? []).map((s) => s.id).join(',')}
    >
      {view}
    </div>
  ),
}))
vi.mock('@/components/domain/ScheduleFormModal/ScheduleFormModal', () => ({
  ScheduleFormModal: () => <div data-testid="schedule-form" />,
}))
vi.mock('@/components/domain/EditScheduleModal/EditScheduleModal', () => ({
  EditScheduleModal: () => <div data-testid="edit-form" />,
}))
// initialData를 실제로 받는지(Important 2 #5) 드러낸다.
vi.mock('@/components/domain/GeneralScheduleFormModal/GeneralScheduleFormModal', () => ({
  GeneralScheduleFormModal: ({ initialData }: { initialData?: { id: string } }) => (
    <div data-testid="event-form" data-initial-id={initialData?.id ?? ''} />
  ),
}))
// null 대신 onEdit/onDelete를 실제로 누를 수 있는 스텁을 둔다(Important 2 #5) —
// 옛 껍데기 mock으로는 삭제/수정 배선을 검증할 방법이 없었다.
vi.mock('@/components/domain/GeneralScheduleDetailSheet/GeneralScheduleDetailSheet', () => ({
  GeneralScheduleDetailSheet: ({
    event: sheetEvent,
    onEdit,
    onDelete,
  }: {
    event: { id: string } | null
    onEdit: () => void
    onDelete: () => void
  }) =>
    sheetEvent ? (
      <div data-testid="detail-sheet">
        <button onClick={onEdit}>edit-event</button>
        <button onClick={onDelete}>delete-event</button>
      </div>
    ) : null,
}))
vi.mock('@/components/domain/ScheduleItem/ScheduleItem', () => ({
  ScheduleItem: ({ schedule: s }: { schedule: Schedule }) => <div>row-{s.id}</div>,
}))
// onClick을 실제로 전달한다 — 상세 시트를 여는 배선(Important 2 #5)을 누르려면
// 옛 정적 mock으로는 불가능했다.
vi.mock('@/components/domain/GeneralEventItem/GeneralEventItem', () => ({
  GeneralEventItem: ({ onClick }: { onClick: () => void }) => (
    <div onClick={onClick}>event-row</div>
  ),
}))
vi.mock('@/components/domain/ScheduleDateRangeFilter/ScheduleDateRangeFilter', () => ({
  ScheduleDateRangeFilter: () => <div />,
}))

describe('SchedulesPage', () => {
  it('opens on the month calendar', () => {
    render(<SchedulesPage />)
    expect(screen.getByTestId('calendar')).toHaveTextContent('month')
  })

  it('switches the calendar to the week view', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'common.weekView' }))
    expect(screen.getByTestId('calendar')).toHaveTextContent('week')
  })

  it('replaces the calendar with a grouped list', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    expect(screen.queryByTestId('calendar')).toBeNull()
    expect(screen.getByText('row-visit')).toBeInTheDocument()
  })

  // 통합의 요점 — 방문과 접견이 한 목록에 함께 있다(스펙 §2.2).
  it('lists visits and interviews together', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    expect(screen.getByText('row-visit')).toBeInTheDocument()
    expect(screen.getByText('row-talk')).toBeInTheDocument()
  })

  it('drops a kind from the list when its chip is turned off', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    await userEvent.click(screen.getByRole('button', { name: 'schedules.kind.interview' }))
    expect(screen.getByText('row-visit')).toBeInTheDocument()
    expect(screen.queryByText('row-talk')).toBeNull()
  })

  // 상태 필터는 목록에만 있다(판정 R26)
  it('offers the status filter only in the list view', async () => {
    render(<SchedulesPage />)
    expect(screen.queryByRole('radiogroup', { name: 'schedules.statusFilterLabel' })).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    expect(
      screen.getByRole('radiogroup', { name: 'schedules.statusFilterLabel' }),
    ).toBeInTheDocument()
  })

  it('lets an admin open the schedule form', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('button', { name: /calendar.addSchedule/ }))
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument()
  })

  it('lets an admin open the event form', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('button', { name: /schedules.addEvent/ }))
    expect(screen.getByTestId('event-form')).toBeInTheDocument()
  })

  // Fix round 1 — Important 2 #1: items/visible이 뒤바뀌면 이 테스트가 잡는다.
  // 지표 3칸은 items(종류·지역·기간)에서 세고, 상태 필터는 화면에 그리는 행에만
  // 닿는다 — 상태를 바꿔도 지표는 그대로고, 보이는 행 수만 줄어야 한다.
  it('keeps the stat tiles unchanged when the status filter narrows the visible rows', async () => {
    schedules = [
      schedule({ id: 'past1', date: PAST }),
      schedule({ id: 'past2', date: PAST2, type: 'interview' }),
      schedule({ id: 'future1', date: FUTURE }),
    ]
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))

    const tileNames = ['schedules.thisMonth', 'schedules.upcoming', 'schedules.completed']
    const readTiles = () => tileNames.map((name) => screen.getByRole('group', { name }).textContent)

    const before = readTiles()
    expect(screen.getAllByText(/^row-/)).toHaveLength(3)

    await userEvent.click(screen.getByRole('radio', { name: 'schedules.status.completed' }))

    expect(readTiles()).toEqual(before)
    expect(screen.getAllByText(/^row-/)).toHaveLength(2)
    expect(screen.queryByText('row-future1')).toBeNull()
  })

  // Fix round 1 — Important 2 #2: 이 테스트가 Important 1(격자가 지역 필터를
  // 무시하던 문제)을 잡는 테스트다. 지역 칩을 고르면 달력 격자로 넘어가는
  // schedules와 우측 목록이 같은 규칙으로 좁혀져야 한다.
  it('narrows the calendar grid to the selected region, matching the side list', async () => {
    schedules = [
      schedule({ id: 'seoulVisit', type: 'ward_visit', unitId: 'seoul-stake', date: PAST }),
      schedule({ id: 'busanVisit', type: 'ward_visit', unitId: 'busan-stake', date: PAST }),
    ]
    render(<SchedulesPage />)

    // 지역 칩은 REGIONS를 그대로 쓴다(2개 이상일 때만 보인다) — 번역 키가 아니라
    // 실제 지역명이 라벨이다.
    await userEvent.click(screen.getByRole('button', { name: '부산 CC' }))

    const grid = screen.getByTestId('calendar')
    expect(grid.dataset.scheduleIds).toBe('busanVisit')
    expect(screen.getByText('row-busanVisit')).toBeInTheDocument()
    expect(screen.queryByText('row-seoulVisit')).toBeNull()
  })

  // Fix round 1 — Important 2 #3: general_attendance는 일정이 아니라 참석
  // 기록이다. buildBoardItems가 이걸 걸러내지 않으면 참석 등록한 행사가 두
  // 줄로 나온다(옛 CalendarPage 버그).
  it('does not double-list an event a seventy is attending as general_attendance', async () => {
    generalSchedules = [event({ id: 'ev1', date: PAST })]
    schedules = [
      schedule({
        id: 'attend1',
        type: 'general_attendance',
        seventyUid: ADMIN.uid,
        generalScheduleId: 'ev1',
        date: PAST,
      }),
    ]
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))

    expect(screen.getAllByText('event-row')).toHaveLength(1)
    // event-row 개수만 보면, general_attendance가 다시 kind를 얻어 ScheduleItem
    // 경로(row-attend1)로 새 줄을 만들어도 이 assertion은 못 잡는다 — 그 줄은
    // event-row가 아니라 row-*로 렌더되기 때문이다. 그 자리에 아무 것도 없는지도 본다.
    expect(screen.queryByText(/^row-attend/)).toBeNull()
  })

  // Fix round 1 — Important 2 #4: 직접 따옴표를 다시 심는 리팩터가 formula
  // injection 방어를 조용히 없애지 못하도록, 내보내기가 이 모듈을 반드시
  // 거치는지 고정한다.
  it('builds the CSV export through rowsToCsv/downloadCsv rather than hand-rolled quoting', async () => {
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('button', { name: 'calendar.exportCsv' }))

    expect(rowsToCsv).toHaveBeenCalled()
    expect(downloadCsv).toHaveBeenCalledWith(expect.any(String), 'CSV_ROWS')
  })

  // Fix round 1 — Important 2 #5 (수정): 상세 시트의 「수정」이 같은 폼을
  // initialData와 함께 다시 연다.
  it('reopens the event form with initialData when the detail sheet edit is pressed', async () => {
    generalSchedules = [event({ id: 'ev1', date: PAST })]
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    await userEvent.click(screen.getByText('event-row'))
    expect(screen.getByTestId('detail-sheet')).toBeInTheDocument()

    await userEvent.click(screen.getByText('edit-event'))

    expect(screen.queryByTestId('detail-sheet')).toBeNull()
    expect(screen.getByTestId('event-form')).toHaveAttribute('data-initial-id', 'ev1')
  })

  // Fix round 1 — Important 2 #5 (삭제): 옛 CalendarPage는 여기서 "행사 일정
  // 페이지에서 삭제할 수 있습니다"라는 하드코딩 안내만 띄웠다. 이 페이지가
  // 이제 그 페이지이므로, 삭제가 실제로 deleteGeneralSchedule까지 닿아야 한다.
  it('deletes the event from the detail sheet through deleteGeneralSchedule', async () => {
    generalSchedules = [event({ id: 'ev1', date: PAST })]
    render(<SchedulesPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'schedules.listView' }))
    await userEvent.click(screen.getByText('event-row'))
    await userEvent.click(screen.getByText('delete-event'))

    expect(scheduleDeleteMock).toHaveBeenCalledWith(
      'ev1',
      expect.any(Function),
      'generalSchedule.deletedSuccess',
    )
    // useDeleteWithUndo는 되돌리기 창(undo window)이 있어야 하므로 여기서는
    // scheduleDelete에 넘긴 삭제 콜백이 진짜 deleteGeneralSchedule을 부르는지만
    // 확인한다 — 실제 되돌리기 타이밍은 useDeleteWithUndo 자신의 테스트가 갖고 있다.
    const doDelete = scheduleDeleteMock.mock.calls[0][1] as () => Promise<void>
    await doDelete()
    expect(deleteGeneralSchedule).toHaveBeenCalledWith('ev1')
  })
})
