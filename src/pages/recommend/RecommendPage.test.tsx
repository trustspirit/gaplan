import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PublicVisitRequest } from '@/types'
import RecommendPage from './RecommendPage'

const getMock = vi.fn()
const submitMock = vi.fn()

vi.mock('@/services/publicFunctions', () => ({
  publicCallable: (name: string) => (name === 'getVisitRequestPublic' ? getMock : submitMock),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

function data(over: Partial<PublicVisitRequest> = {}): PublicVisitRequest {
  return {
    title: '1월 와드 방문',
    note: '',
    guidance: '',
    seventyName: '김칠십',
    dueDate: null,
    status: 'open',
    sundays: ['2027-01-10', '2027-01-17', '2027-01-24'],
    units: [
      {
        id: 'seoul-stake', ko: '서울 스테이크', en: 'Seoul Stake',
        wards: [
          { id: 'seoul-nokbeon', ko: '녹번 와드', en: 'Nokbeon Ward' },
          { id: 'seoul-sinchon', ko: '신촌 와드', en: 'Sinchon Ward' },
        ],
      },
      {
        id: 'seoul-east-stake', ko: '서울동 스테이크', en: 'Seoul East Stake',
        wards: [{ id: 'seoul-east-gyomun', ko: '교문 와드', en: 'Gyomun Ward' }],
      },
    ],
    decisions: {
      '2027-01-24': { unitId: 'seoul-east-stake', wardId: 'seoul-east-gyomun', wardName: '교문 와드' },
    },
    recommendations: [
      {
        unitId: 'seoul-east-stake', submitterName: '이회장', submittedAt: '2026-11-01T00:00:00Z', hasNote: true,
        picks: [{ date: '2027-01-10', wardId: 'seoul-east-gyomun', wardName: '교문 와드' }],
      },
    ],
    sundayStatus: {},
    wardStats: {
      'seoul-nokbeon': { lastVisit: null, nextVisit: null, count12m: 0 },
      'seoul-sinchon': { lastVisit: '2026-10-04', nextVisit: null, count12m: 2 },
    },
    ...over,
  }
}

beforeEach(() => {
  localStorage.clear()
  // 고른 단위가 주소(?unit=)에 남는다 — 테스트마다 처음 화면에서 시작한다.
  window.history.replaceState(null, '', '/recommend/r1/0123456789abcdef')
  getMock.mockReset()
  submitMock.mockReset()
  submitMock.mockResolvedValue({ data: { success: true } })
})

/** 일요일마다 와드를 고르는 칸(펼침 버튼) — 다른 단추에는 aria-expanded가 없다 */
function triggers() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'))
}

async function pick(user: ReturnType<typeof userEvent.setup>, index: number, ward: string) {
  await user.click(triggers()[index])
  await user.click(screen.getByRole('button', { name: new RegExp(ward), pressed: false }))
}

async function openAsSeoul() {
  getMock.mockResolvedValue({ data: data() })
  const user = userEvent.setup()
  render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
  await user.click(await screen.findByRole('button', { name: /서울 스테이크/ }))
  return user
}

describe('RecommendPage', () => {
  it('tells an invalid link apart from a load failure', async () => {
    getMock.mockRejectedValue({ code: 'functions/permission-denied' })
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('recommend.invalidLink')
    expect(screen.queryByText('common.retry')).not.toBeInTheDocument()
  })

  it('shows which units already submitted before one is chosen', async () => {
    getMock.mockResolvedValue({ data: data() })
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    const east = await screen.findByRole('button', { name: /서울동 스테이크/ })
    expect(east).toHaveTextContent('이회장')
    // 단위를 고르기 전에는 일요일 목록을 보여 주지 않는다
    expect(screen.queryByText('recommend.step2')).not.toBeInTheDocument()
  })

  it('lists the ward visit history with the longest-unvisited ward first', async () => {
    await openAsSeoul()
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('녹번 와드')
    expect(rows[0]).toHaveTextContent('recommend.toneNever')
    expect(rows[1]).toHaveTextContent('신촌 와드')
  })

  it("shows other units' picks on a Sunday and locks a Sunday decided for another unit", async () => {
    await openAsSeoul()
    expect(screen.getAllByText(/recommend.othersPicked/)).toHaveLength(1)
    expect(screen.getByText(/recommend.decided:/)).toHaveTextContent('교문 와드')
    // 정해지지 않은 두 일요일에만 고르는 칸이 있다
    expect(triggers()).toHaveLength(2)
  })

  it('asks for a name before sending', async () => {
    const user = await openAsSeoul()
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    expect(screen.getByRole('alert')).toHaveTextContent('recommend.nameRequired')
    expect(submitMock).not.toHaveBeenCalled()
  })

  it('sends one ward per picked Sunday and then confirms', async () => {
    const user = await openAsSeoul()
    await pick(user, 1, '신촌 와드')
    await pick(user, 0, '녹번 와드')
    await user.type(screen.getByLabelText('recommend.nameLabel'), '홍길동 회장')
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))

    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(submitMock.mock.calls[0][0]).toEqual({
      requestId: 'r1',
      token: '0123456789abcdef',
      unitId: 'seoul-stake',
      submitterName: '홍길동 회장',
      picks: [
        { date: '2027-01-10', wardId: 'seoul-nokbeon' },
        { date: '2027-01-17', wardId: 'seoul-sinchon' },
      ],
    })
    expect(await screen.findByText('recommend.doneTitle')).toBeInTheDocument()
  })

  it("prefills a unit's earlier recommendation so a president only changes what changed", async () => {
    getMock.mockResolvedValue({ data: data() })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /서울동 스테이크/ }))
    expect(screen.getByLabelText('recommend.nameLabel')).toHaveValue('이회장')
    expect(triggers()[0]).toHaveTextContent('교문 와드')
    expect(screen.getByRole('button', { name: 'recommend.resubmit' })).toBeInTheDocument()
  })

  it('shows a closed request read-only', async () => {
    getMock.mockResolvedValue({ data: data({ status: 'closed' }) })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /서울 스테이크/ }))
    expect(screen.getByText('recommend.closedBanner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'recommend.submit' })).not.toBeInTheDocument()
    triggers().forEach((c) => expect(c).toBeDisabled())
  })

  it('keeps an earlier note unless the president writes a new one', async () => {
    getMock.mockResolvedValue({ data: data() })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /서울동 스테이크/ }))
    expect(screen.getByText('recommend.noteKept')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'recommend.resubmit' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(submitMock.mock.calls[0][0]).not.toHaveProperty('note')
  })

  it('keeps unsaved picks when a failed submit reloads the request', async () => {
    const user = await openAsSeoul()
    submitMock.mockRejectedValueOnce(new Error('closed'))
    await pick(user, 1, '신촌 와드')
    await user.type(screen.getByLabelText('recommend.nameLabel'), '홍길동 회장')
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('recommend.submitFailed')
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
    expect(triggers()[1]).toHaveTextContent('신촌 와드')
  })

  it('does not count or send a Sunday that was decided for another unit', async () => {
    getMock.mockResolvedValueOnce({ data: data({ decisions: {} }) })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /^서울 스테이크/ }))
    await pick(user, 2, '신촌 와드') // 1월 24일
    await pick(user, 0, '녹번 와드')
    expect(screen.getByText(/recommend.pickedCount/)).toHaveTextContent('"count":2')

    // 그사이 1월 24일이 다른 단위로 확정됐다 — 제출이 실패하고 새 상태를 받는다
    submitMock.mockRejectedValueOnce(new Error('decided'))
    getMock.mockResolvedValue({ data: data() })
    await user.type(screen.getByLabelText('recommend.nameLabel'), '홍')
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    await waitFor(() => expect(screen.getByText(/recommend.pickedCount/)).toHaveTextContent('"count":1'))

    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2))
    expect(submitMock.mock.calls[1][0].picks).toEqual([{ date: '2027-01-10', wardId: 'seoul-nokbeon' }])
  })

  it('shows the emphasis on the gate and on the recommendation screen', async () => {
    getMock.mockResolvedValue({ data: data({ guidance: '오래 방문받지 못한 와드를 먼저 추천해 주세요.' }) })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    expect(await screen.findByText('오래 방문받지 못한 와드를 먼저 추천해 주세요.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^서울 스테이크/ }))
    expect(screen.getByText('오래 방문받지 못한 와드를 먼저 추천해 주세요.')).toBeInTheDocument()
    // 강조가 있으면 고정 안내 문구는 빼서 같은 말을 두 번 하지 않는다
    expect(screen.queryByText('recommend.statsHint')).not.toBeInTheDocument()
    expect(screen.getByText('recommend.verifiedTitle')).toBeInTheDocument()
  })

  it("does not offer a Sunday the seventy can't come or that has our own conference", async () => {
    getMock.mockResolvedValue({
      data: data({
        decisions: {},
        sundayStatus: {
          '2027-01-10': { busy: [{ kind: 'event', label: '지역 대회' }], notes: [], unitBlocks: {} },
          '2027-01-17': { busy: [], notes: [], unitBlocks: { 'seoul-stake': '서울 스테이크 대회' } },
        },
      }),
    })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /^서울 스테이크/ }))
    expect(triggers()).toHaveLength(1)
    expect(screen.getByText(/recommend.busy · 지역 대회/)).toBeInTheDocument()
    expect(screen.getByText(/recommend.unitBlockedTitle/)).toHaveTextContent('서울 스테이크 대회')
  })

  it("puts only this unit's and area-wide events on the calendar", async () => {
    getMock.mockResolvedValue({
      data: data({
        calendarEvents: [
          { title: '서울 스테이크 대회', date: '2027-01-16', endDate: null, category: 'conference', unitIds: ['seoul-stake'], blocking: true, seventyAttends: false },
          { title: '서울동 청년 활동', date: '2027-01-16', endDate: null, category: 'other', unitIds: ['seoul-east-stake'], blocking: false, seventyAttends: false },
          { title: '지역 선교 대회', date: '2027-01-30', endDate: null, category: 'other', unitIds: null, blocking: false, seventyAttends: false },
        ],
      }),
    })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /^서울 스테이크/ }))
    await user.click(screen.getByRole('tab', { name: /recommend.viewCalendar/ }))
    const grid = screen.getByRole('grid')
    expect(within(grid).getByText('서울 스테이크 대회')).toBeInTheDocument()
    expect(within(grid).getByText('지역 선교 대회')).toBeInTheDocument()
    expect(within(grid).queryByText('서울동 청년 활동')).not.toBeInTheDocument()
  })

  it('picks a ward right from the calendar and keeps the list in sync', async () => {
    getMock.mockResolvedValue({ data: data() })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await user.click(await screen.findByRole('button', { name: /^서울 스테이크/ }))
    await user.click(screen.getByRole('tab', { name: /recommend.viewCalendar/ }))
    // 테스트의 t는 날짜 형식을 키 그대로 돌려줘 aria-label로는 못 찾는다 — 칸의 숫자로 찾는다
    const jan17 = within(screen.getByRole('grid'))
      .getAllByRole('button')
      .find((b) => b.textContent?.startsWith('17'))!
    await user.click(jan17)
    await user.click(screen.getByRole('button', { name: /신촌 와드/ }))
    expect(screen.getByRole('button', { name: /신촌 와드/, pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /recommend.viewList/ }))
    expect(triggers()[1]).toHaveTextContent('신촌 와드')
  })
})
