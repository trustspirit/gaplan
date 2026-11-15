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
        unitId: 'seoul-east-stake', submitterName: '이회장', submittedAt: '2026-11-01T00:00:00Z',
        picks: [{ date: '2027-01-10', wardId: 'seoul-east-gyomun', wardName: '교문 와드' }],
      },
    ],
    wardStats: {
      'seoul-nokbeon': { lastVisit: null, nextVisit: null, count12m: 0 },
      'seoul-sinchon': { lastVisit: '2026-10-04', nextVisit: null, count12m: 2 },
    },
    ...over,
  }
}

beforeEach(() => {
  localStorage.clear()
  getMock.mockReset()
  submitMock.mockReset()
  submitMock.mockResolvedValue({ data: { success: true } })
})

async function openAsSeoul() {
  getMock.mockResolvedValue({ data: data() })
  const user = userEvent.setup()
  render(<RecommendPage token="0123456789abcdef" />)
  await user.click(await screen.findByRole('radio', { name: /서울 스테이크/ }))
  return user
}

describe('RecommendPage', () => {
  it('tells an invalid link apart from a load failure', async () => {
    getMock.mockRejectedValue({ code: 'functions/permission-denied' })
    render(<RecommendPage token="0123456789abcdef" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('recommend.invalidLink')
    expect(screen.queryByText('common.retry')).not.toBeInTheDocument()
  })

  it('shows which units already submitted before one is chosen', async () => {
    getMock.mockResolvedValue({ data: data() })
    render(<RecommendPage token="0123456789abcdef" />)
    const east = await screen.findByRole('radio', { name: /서울동 스테이크/ })
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
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('asks for a name before sending', async () => {
    const user = await openAsSeoul()
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))
    expect(screen.getByRole('alert')).toHaveTextContent('recommend.nameRequired')
    expect(submitMock).not.toHaveBeenCalled()
  })

  it('sends one ward per picked Sunday and then confirms', async () => {
    const user = await openAsSeoul()
    const [jan10, jan17] = screen.getAllByRole('combobox')
    await user.selectOptions(jan17, 'seoul-sinchon')
    await user.selectOptions(jan10, 'seoul-nokbeon')
    await user.type(screen.getByLabelText('recommend.nameLabel'), '홍길동 회장')
    await user.click(screen.getByRole('button', { name: 'recommend.submit' }))

    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(submitMock.mock.calls[0][0]).toEqual({
      token: '0123456789abcdef',
      unitId: 'seoul-stake',
      submitterName: '홍길동 회장',
      note: '',
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
    render(<RecommendPage token="0123456789abcdef" />)
    await user.click(await screen.findByRole('radio', { name: /서울동 스테이크/ }))
    expect(screen.getByLabelText('recommend.nameLabel')).toHaveValue('이회장')
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('seoul-east-gyomun')
    expect(screen.getByRole('button', { name: 'recommend.resubmit' })).toBeInTheDocument()
  })

  it('shows a closed request read-only', async () => {
    getMock.mockResolvedValue({ data: data({ status: 'closed' }) })
    const user = userEvent.setup()
    render(<RecommendPage token="0123456789abcdef" />)
    await user.click(await screen.findByRole('radio', { name: /서울 스테이크/ }))
    expect(screen.getByText('recommend.closedBanner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'recommend.submit' })).not.toBeInTheDocument()
    screen.getAllByRole('combobox').forEach((c) => expect(c).toBeDisabled())
  })
})
