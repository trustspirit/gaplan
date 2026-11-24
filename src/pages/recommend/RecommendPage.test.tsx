import { cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PublicVisitRequest } from '@/types'
import RecommendPage from './RecommendPage'

const getMock = vi.fn()
const submitMock = vi.fn()

vi.mock('@/services/publicFunctions', () => ({
  publicCallable: (name: string) => (name === 'getVisitRequestPublic' ? getMock : submitMock),
}))
const changeLanguage = vi.hoisted(() => vi.fn())
const langMock = vi.hoisted(() => ({ value: 'ko' }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
    i18n: { get language() { return langMock.value }, changeLanguage },
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
    ],
    // 서버는 다른 스테이크로 확정된 날을 빈 값으로만 보낸다
    decisions: {
      '2027-01-24': { unitId: '', wardId: '', wardName: '' },
    },
    recommendations: [],
    sundayStatus: {},
    wardStats: {
      'seoul-nokbeon': { lastVisit: null, nextVisit: null, count12m: 0 },
      'seoul-sinchon': { lastVisit: '2026-10-04', nextVisit: null, count12m: 2 },
    },
    ...over,
  }
}

const earlier = {
  unitId: 'seoul-stake', submitterName: '이회장', submittedAt: '2026-11-01T00:00:00Z', hasNote: true,
  picks: [{ date: '2027-01-10', wardId: 'seoul-sinchon', wardName: '신촌 와드' }],
}

beforeEach(() => {
  localStorage.clear()
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

/** 스테이크 링크를 연다 — 링크가 곧 스테이크라 고르는 단계 없이 추천 화면이 뜬다 */
async function open(over: Partial<PublicVisitRequest> = {}) {
  getMock.mockResolvedValue({ data: data(over) })
  const user = userEvent.setup()
  render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
  await screen.findByText('recommend.step2')
  return user
}
const openAsSeoul = () => open()

describe('RecommendPage', () => {
  it('opens in the language the link asks for, and nothing else decides it', async () => {
    try {
      window.history.pushState({}, '', '/recommend/r1/0123456789abcdef?lang=en')
      await open()
      expect(changeLanguage).toHaveBeenLastCalledWith('en')
      cleanup()
      changeLanguage.mockClear()
      // 전에 영어 링크를 열었던 브라우저라도, lang 없는 링크는 한국어로 연다
      localStorage.setItem('publicLang', 'en')
      window.history.pushState({}, '', '/recommend/r1/0123456789abcdef')
      await open()
      expect(changeLanguage).not.toHaveBeenCalledWith('en')
      expect(localStorage.getItem('gaplan-lang')).toBeNull()
    } finally {
      window.history.pushState({}, '', '/')
      changeLanguage.mockClear()
    }
  })

  it('shows an English link the translated title, seventy and guidance', async () => {
    langMock.value = 'en'
    try {
      await open({
        title: '1월 방문', seventyName: '박경렬', guidance: '오래된 와드 먼저',
        english: { title: 'January Visits', seventy: 'Park Kyungryeol', guidance: 'Longest-unvisited wards first' },
      })
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('January Visits')
      expect(screen.getByText(/Park Kyungryeol/)).toBeInTheDocument()
      expect(screen.getByText('Longest-unvisited wards first')).toBeInTheDocument()
      expect(screen.queryByText('오래된 와드 먼저')).not.toBeInTheDocument()
    } finally {
      langMock.value = 'ko'
    }
  })

  it('tells an invalid link apart from a load failure', async () => {
    getMock.mockRejectedValue({ code: 'functions/permission-denied' })
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('recommend.invalidLink')
    expect(screen.queryByText('common.retry')).not.toBeInTheDocument()
  })

  it('opens straight into the stake of the link, without a unit picker', async () => {
    await open()
    expect(screen.getByText('서울 스테이크')).toBeInTheDocument()
    expect(screen.queryByText('recommend.gateTitle')).not.toBeInTheDocument()
    expect(screen.queryByText('recommend.changeUnit')).not.toBeInTheDocument()
  })

  it('lists the ward visit history with the longest-unvisited ward first', async () => {
    await openAsSeoul()
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('녹번 와드')
    expect(rows[0]).toHaveTextContent('recommend.toneNever')
    expect(rows[1]).toHaveTextContent('신촌 와드')
  })

  it('shows a Sunday decided elsewhere only as decided, without naming the stake', async () => {
    await openAsSeoul()
    expect(screen.queryByText(/recommend.othersPicked/)).not.toBeInTheDocument()
    expect(screen.getAllByText('recommend.decidedOther').length).toBeGreaterThan(0)
    expect(document.body).not.toHaveTextContent('교문')
    // 정해지지 않은 두 일요일에만 고르는 칸이 있다
    expect(triggers()).toHaveLength(2)
  })

  it('does not ask for a name — the link already tells which stake sent it', async () => {
    await openAsSeoul()
    expect(screen.queryByLabelText('recommend.nameLabel')).not.toBeInTheDocument()
  })

  it('sends one ward per picked Sunday and then confirms', async () => {
    const user = await openAsSeoul()
    await pick(user, 1, '신촌 와드')
    await pick(user, 0, '녹번 와드')
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))

    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(submitMock.mock.calls[0][0]).toEqual({
      requestId: 'r1',
      token: '0123456789abcdef',
      unitId: 'seoul-stake',
      picks: [
        { date: '2027-01-10', wardId: 'seoul-nokbeon' },
        { date: '2027-01-17', wardId: 'seoul-sinchon' },
      ],
    })
    expect(await screen.findByText('recommend.doneTitle')).toBeInTheDocument()
  })

  it("prefills a unit's earlier recommendation so a president only changes what changed", async () => {
    await open({ recommendations: [earlier] })
    // 받은 뒤 한 번 채운다(effect) — 채워질 때까지 기다린다
    await waitFor(() => expect(triggers()[0]).toHaveTextContent('신촌 와드'))
    expect(screen.getByRole('button', { name: 'recommend.resubmit' })).toBeInTheDocument()
  })

  it('shows a closed request read-only', async () => {
    await open({ status: 'closed' })
    expect(screen.getByText('recommend.closedBanner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'recommend.submit' })).not.toBeInTheDocument()
    triggers().forEach((c) => expect(c).toBeDisabled())
  })

  it('keeps an earlier note unless the president writes a new one', async () => {
    const user = await open({ recommendations: [earlier] })
    expect(screen.getByText('recommend.noteKept')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'recommend.resubmit' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(submitMock.mock.calls[0][0]).not.toHaveProperty('note')
  })

  it('keeps unsaved picks when a failed submit reloads the request', async () => {
    const user = await openAsSeoul()
    submitMock.mockRejectedValueOnce(new Error('closed'))
    await pick(user, 1, '신촌 와드')
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('recommend.submitFailed')
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
    expect(triggers()[1]).toHaveTextContent('신촌 와드')
  })

  it('does not count or send a Sunday that was decided for another unit', async () => {
    getMock.mockResolvedValueOnce({ data: data({ decisions: {} }) })
    const user = userEvent.setup()
    render(<RecommendPage requestId="r1" token="0123456789abcdef" />)
    await screen.findByText('recommend.step2')
    await pick(user, 2, '신촌 와드') // 1월 24일
    await pick(user, 0, '녹번 와드')
    expect(screen.getByText(/recommend.pickedCount/)).toHaveTextContent('"count":2')

    // 그사이 1월 24일이 다른 단위로 확정됐다 — 제출이 실패하고 새 상태를 받는다
    submitMock.mockRejectedValueOnce(new Error('decided'))
    getMock.mockResolvedValue({ data: data() })
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    await waitFor(() => expect(screen.getByText(/recommend.pickedCount/)).toHaveTextContent('"count":1'))

    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(2))
    expect(submitMock.mock.calls[1][0].picks).toEqual([{ date: '2027-01-10', wardId: 'seoul-nokbeon' }])
  })

  it('shows the emphasis on the recommendation screen', async () => {
    await open({ guidance: '오래 방문받지 못한 와드를 먼저 추천해 주세요.' })
    expect(screen.getByText('오래 방문받지 못한 와드를 먼저 추천해 주세요.')).toBeInTheDocument()
    // 강조가 있으면 고정 안내 문구는 빼서 같은 말을 두 번 하지 않는다
    expect(screen.queryByText('recommend.statsHint')).not.toBeInTheDocument()
    // 확인된 날이라는 설명은 단계 안내 한 줄로 — 따로 상자를 두지 않는다
    expect(screen.queryByText('recommend.verifiedTitle')).not.toBeInTheDocument()
    expect(screen.getByText('recommend.step2Hint')).toBeInTheDocument()
  })

  it("does not offer a Sunday the seventy can't come or that has our own conference", async () => {
    await open({
      decisions: {},
      sundayStatus: {
        '2027-01-10': { busy: [{ kind: 'event', label: '지역 대회' }], notes: [], unitBlocks: {} },
        '2027-01-17': { busy: [], notes: [], unitBlocks: { 'seoul-stake': '서울 스테이크 대회' } },
      },
    })
    expect(triggers()).toHaveLength(1)
    expect(screen.getByText(/recommend.busy · 지역 대회/)).toBeInTheDocument()
    expect(screen.getByText(/recommend.unitBlockedTitle/)).toHaveTextContent('서울 스테이크 대회')
  })

  it("puts only this unit's and area-wide events on the calendar", async () => {
    const user = await open({
      calendarEvents: [
        { title: '서울 스테이크 대회', date: '2027-01-16', endDate: null, category: 'conference', unitIds: ['seoul-stake'], blocking: true, seventyAttends: false },
        { title: '서울동 청년 활동', date: '2027-01-16', endDate: null, category: 'other', unitIds: ['seoul-east-stake'], blocking: false, seventyAttends: false },
        { title: '지역 선교 대회', date: '2027-01-30', endDate: null, category: 'other', unitIds: null, blocking: false, seventyAttends: false },
      ],
    })
    await user.click(screen.getByRole('tab', { name: /recommend.viewCalendar/ }))
    const grid = screen.getByRole('grid')
    expect(within(grid).getByText('서울 스테이크 대회')).toBeInTheDocument()
    expect(within(grid).getByText('지역 선교 대회')).toBeInTheDocument()
    expect(within(grid).queryByText('서울동 청년 활동')).not.toBeInTheDocument()
  })

  it('picks a ward right from the calendar and keeps the list in sync', async () => {
    const user = await open()
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

  it("only offers Sundays that are this unit's CC turn", async () => {
    const base = data()
    await open({
      units: base.units.map((u) => ({ ...u, regionId: 'seoul' })),
      sundayRegions: { '2027-01-10': 'seoul', '2027-01-17': 'seoul-south', '2027-01-24': 'seoul' },
      regions: [{ id: 'seoul', name: '서울 CC' }, { id: 'seoul-south', name: '서울남 CC' }],
    })
    expect(triggers()).toHaveLength(1)
    expect(screen.getAllByText(/recommend.otherRegion:/)[0]).toHaveTextContent('서울남 CC')
  })

  it('marks the Sundays still to pick on the calendar, rather than ticking them', async () => {
    const user = await open()
    await user.click(screen.getByRole('tab', { name: /recommend.viewCalendar/ }))
    // 1/10, 1/17은 고를 수 있고 1/24는 다른 곳으로 확정
    expect(within(screen.getByRole('grid')).getAllByText('recommend.cellPick')).toHaveLength(2)
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (q: string) => ({
        matches: q.includes('min-width: 960px'), media: q,
        addEventListener: vi.fn(), removeEventListener: vi.fn(),
      }))
      Element.prototype.scrollIntoView = vi.fn()
    })
    afterEach(() => vi.unstubAllGlobals())

    it('opens the Sunday in the list when it is picked on the calendar', async () => {
      const user = await open()
      const jan17 = within(screen.getByRole('grid'))
        .getAllByRole('button')
        .find((b) => b.textContent?.startsWith('17'))!
      await user.click(jan17)
      expect(triggers()[1]).toHaveAttribute('aria-expanded', 'true')
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
      // 고르는 곳은 목록 하나 — 달력 안에 따로 고르는 칸을 열지 않는다
      expect(screen.queryByText('recommend.pickHere')).not.toBeInTheDocument()
    })
  })
})
