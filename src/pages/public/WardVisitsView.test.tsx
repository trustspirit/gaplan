import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import dayjs from 'dayjs'
import { WardVisitsView } from './WardVisitsView'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

const { fetchPublicWardVisitsMock } = vi.hoisted(() => ({ fetchPublicWardVisitsMock: vi.fn() }))

vi.mock('@/services/publicScheduleService', () => ({
  fetchPublicWardVisits: fetchPublicWardVisitsMock,
}))

const Y = dayjs().year()

beforeEach(() => {
  fetchPublicWardVisitsMock.mockReset()
  fetchPublicWardVisitsMock.mockResolvedValue([
    { id: 'v1', date: `${Y}-01-04`, wardName: '교문 와드', unitId: 'seoul-east-stake' },
  ])
})

describe('WardVisitsView', () => {
  it('올해 방문을 받아 휴대폰 카드와 데스크톱 표 양쪽에 와드와 스테이크 짧은 이름으로 보여 준다', async () => {
    render(<WardVisitsView token="tok" />)

    await waitFor(() => expect(screen.getAllByText('교문 와드')).toHaveLength(2))
    expect(fetchPublicWardVisitsMock).toHaveBeenCalledWith('tok', Y)
    expect(screen.getAllByText('서울동').length).toBeGreaterThanOrEqual(2)
  })

  it('방문 없는 일요일 줄에는 방문 없음이 보인다', async () => {
    render(<WardVisitsView token="tok" />)
    await waitFor(() => expect(screen.getAllByText('public.wardNoVisit').length).toBeGreaterThan(0))
  })

  it('해를 넘기면 그 해를 받고, 이미 받은 해는 다시 부르지 않는다', async () => {
    render(<WardVisitsView token="tok" />)
    await waitFor(() => expect(screen.getAllByText('교문 와드')).toHaveLength(2))

    fireEvent.click(screen.getByLabelText('public.wardPrevYear'))
    await waitFor(() => expect(fetchPublicWardVisitsMock).toHaveBeenLastCalledWith('tok', Y - 1))
    fireEvent.click(screen.getByLabelText('public.wardNextYear'))

    await waitFor(() => expect(screen.getAllByText('교문 와드')).toHaveLength(2))
    expect(fetchPublicWardVisitsMock).toHaveBeenCalledTimes(2)
  })

  it('내년보다 뒤로는 넘길 수 없다', async () => {
    render(<WardVisitsView token="tok" />)
    await waitFor(() => expect(screen.getAllByText('교문 와드')).toHaveLength(2))

    fireEvent.click(screen.getByLabelText('public.wardNextYear'))

    await waitFor(() => expect(fetchPublicWardVisitsMock).toHaveBeenLastCalledWith('tok', Y + 1))
    expect(screen.getByLabelText('public.wardNextYear')).toBeDisabled()
  })

  it('실패하면 다시 시도 버튼을 보여 주고, 누르면 같은 해로 다시 부른다', async () => {
    fetchPublicWardVisitsMock.mockReset()
    fetchPublicWardVisitsMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([])
    render(<WardVisitsView token="tok" />)

    expect(await screen.findByText('public.wardLoadError')).toBeInTheDocument()
    fireEvent.click(screen.getByText('public.retry'))

    await waitFor(() => expect(fetchPublicWardVisitsMock).toHaveBeenCalledTimes(2))
    expect(fetchPublicWardVisitsMock).toHaveBeenLastCalledWith('tok', Y)
  })

  // 스테이크 색·방문 칸 색칠은 사용자가 시선이 흩어진다고 거절했다 — 방문 요소에 인라인 색을 두지 않는다.
  it('방문 표시에 인라인 색을 쓰지 않는다', async () => {
    const { container } = render(<WardVisitsView token="tok" />)
    await waitFor(() => expect(screen.getAllByText('교문 와드')).toHaveLength(2))

    const visits = container.querySelectorAll('[data-visit]')
    expect(visits.length).toBeGreaterThan(0)
    for (const el of Array.from(visits)) expect(el.getAttribute('style')).toBeNull()
  })
})
