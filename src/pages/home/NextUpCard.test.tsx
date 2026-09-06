import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Schedule } from '@/types'
import { NextUpCard } from './NextUpCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // 보간 인자까지 눈에 보이게 찍어야 "오늘 14:00" 같은 조합을 검사할 수 있다.
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${Object.values(opts).join(',')}` : key,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

const schedule = (over: Partial<Schedule> = {}): Schedule => ({
  id: 's1',
  type: 'interview',
  seventyUid: 'sev',
  unitId: 'seoul-east-stake',
  presidentUid: null,
  date: '2026-07-02',
  startTime: '14:00',
  endTime: '15:00',
  status: 'confirmed',
  createdBy: 'a',
  ...over,
})

const NOW = '2026-07-02T09:00'

describe('NextUpCard', () => {
  it('제목을 보여준다', () => {
    render(<NextUpCard schedule={schedule()} unitName="서울동 스테이크" now={NOW} />)
    expect(screen.getByText('서울동 스테이크 접견')).toBeInTheDocument()
  })

  // 제목이 이미 "서울동 스테이크 접견"이라 소속을 또 쓰면 같은 말이 두 번 나온다.
  // 목록 행이 쓰는 규칙(scheduleSubtitle)을 그대로 공유해 피한다.
  it('제목이 이미 소속을 말하면 아래에 되풀이하지 않는다', () => {
    render(<NextUpCard schedule={schedule()} unitName="서울동 스테이크" now={NOW} />)
    expect(screen.queryByText('서울동 스테이크')).not.toBeInTheDocument()
  })

  it('제목이 말하지 않은 장소가 있으면 그걸 보여준다', () => {
    render(
      <NextUpCard
        schedule={schedule({ location: '스테이크 센터 2층' })}
        unitName="서울동 스테이크"
        now={NOW}
      />,
    )
    expect(screen.getByText('스테이크 센터 2층')).toBeInTheDocument()
  })

  it('오늘 일정이면 오늘 문구와 시각을 쓴다', () => {
    render(<NextUpCard schedule={schedule()} unitName="서울동 스테이크" now={NOW} />)
    expect(screen.getByText(/home\.nextUpToday:14:00/)).toBeInTheDocument()
  })

  it('한 시간 안이면 남은 분을 함께 보여준다', () => {
    render(
      <NextUpCard schedule={schedule()} unitName="서울동 스테이크" now="2026-07-02T13:30" />,
    )
    expect(screen.getByText(/home\.nextUpInMinutes:30/)).toBeInTheDocument()
  })

  // 접견 도중에 홈을 열었을 때 "‑30분 뒤" 같은 문구가 나오면 안 된다.
  it('이미 시작했으면 진행 중이라고 말한다', () => {
    render(
      <NextUpCard schedule={schedule()} unitName="서울동 스테이크" now="2026-07-02T14:30" />,
    )
    expect(screen.getByText('home.nextUpNow')).toBeInTheDocument()
    expect(screen.queryByText(/nextUpInMinutes/)).not.toBeInTheDocument()
  })

  it('내일 일정이면 내일 문구를 쓴다', () => {
    render(
      <NextUpCard schedule={schedule({ date: '2026-07-03' })} unitName="서울동 스테이크" now={NOW} />,
    )
    expect(screen.getByText(/home\.nextUpTomorrow:14:00/)).toBeInTheDocument()
  })

  it('모레 이후면 D-n을 쓴다', () => {
    render(
      <NextUpCard schedule={schedule({ date: '2026-07-05' })} unitName="서울동 스테이크" now={NOW} />,
    )
    expect(screen.getByText(/home\.nextUpDday:3/)).toBeInTheDocument()
  })

  it('Zoom 링크가 있으면 새 탭으로 여는 입장 링크를 준다', () => {
    render(
      <NextUpCard
        schedule={schedule({ zoomLink: 'https://zoom.us/j/1' })}
        unitName="서울동 스테이크"
        now={NOW}
      />,
    )
    const link = screen.getByRole('link', { name: /joinZoom/ })
    expect(link).toHaveAttribute('href', 'https://zoom.us/j/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('Zoom 링크가 없으면 입장 링크를 그리지 않는다', () => {
    render(<NextUpCard schedule={schedule()} unitName="서울동 스테이크" now={NOW} />)
    expect(screen.queryByRole('link', { name: /joinZoom/ })).not.toBeInTheDocument()
  })

  // 사용자가 붙여넣은 값이 그대로 href가 되면 javascript: 스킴이 실행될 수 있다.
  // ScheduleItem 옆의 공개 페이지가 이미 같은 가드를 쓴다.
  it('http(s)가 아닌 zoomLink는 링크로 만들지 않는다', () => {
    render(
      <NextUpCard
        schedule={schedule({ zoomLink: 'javascript:alert(1)' })}
        unitName="서울동 스테이크"
        now={NOW}
      />,
    )
    expect(screen.queryByRole('link', { name: /joinZoom/ })).not.toBeInTheDocument()
  })
})
