import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import dayjs from 'dayjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

function firstWeekdayOfJanuary(year: number): string {
  let d = dayjs(`${year}-01-01`)
  while (d.day() === 0) d = d.add(1, 'day')
  return d.format('YYYY-MM-DD')
}

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

  it('같은 평일 날짜에 방문이 둘이면 한 줄에 함께 쌓는다', async () => {
    const date = firstWeekdayOfJanuary(Y)
    fetchPublicWardVisitsMock.mockReset()
    fetchPublicWardVisitsMock.mockResolvedValue([
      { id: 'a', date, wardName: '녹번 와드', unitId: 'seoul-stake' },
      { id: 'b', date, wardName: '신촌 와드', unitId: 'seoul-stake' },
    ])
    const { container } = render(<WardVisitsView token="tok" />)

    // 카드는 이름만, 표는 이름 뒤에 요일을 붙인다 — 둘 다 세려고 앞부분으로 찾는다.
    await waitFor(() => expect(screen.getAllByText(/^녹번 와드/)).toHaveLength(2))
    expect(screen.getAllByText(/^신촌 와드/)).toHaveLength(2)
    expect(container.querySelectorAll(`[data-row-date="${date}"]`)).toHaveLength(1)
  })

  it('scrollToCurrentMonth일 때만 이번 달 카드로 한 번 내리고 알린다', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const original = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({ top: 600, bottom: 600, left: 0, right: 0, width: 0, height: 0, x: 0, y: 600, toJSON: () => ({}) }) as DOMRect
    const onAutoScrolled = vi.fn()
    try {
      const { unmount } = render(
        <WardVisitsView token="tok" scrollToCurrentMonth={false} onAutoScrolled={onAutoScrolled} />,
      )
      await waitFor(() => expect(screen.getAllByText('교문 와드')).toHaveLength(2))
      expect(scrollTo).not.toHaveBeenCalled()
      unmount()

      render(<WardVisitsView token="tok" scrollToCurrentMonth onAutoScrolled={onAutoScrolled} />)
      await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1))
      expect(onAutoScrolled).toHaveBeenCalledTimes(1)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original
      scrollTo.mockRestore()
    }
  })

  // 긴 와드 이름 뒤의 "예정"·요일이 말줄임으로 잘리면 예정인지 알 수 없다 — 줄바꿈을 허용한다.
  it('방문 표시는 한 줄로 자르지 않는다', () => {
    const scss = readFileSync(resolve(__dirname, 'WardVisitsView.module.scss'), 'utf8')
    const block = scss.slice(scss.indexOf('.visit {'), scss.indexOf('}', scss.indexOf('.visit {')))
    expect(block).not.toMatch(/white-space:\s*nowrap/)
    expect(block).not.toMatch(/text-overflow:\s*ellipsis/)
  })
})
