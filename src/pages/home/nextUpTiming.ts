import dayjs from 'dayjs'

export interface RelativeWhen {
  /** 어느 날인가 — 문구를 고르는 기준. */
  day: 'today' | 'tomorrow' | 'dday'
  /** 시작까지 남은 분. 이미 시작했으면 0 이하. day가 'today'일 때만 쓴다. */
  minutesUntil: number
  /** 날짜 차이. 오늘이면 0, 내일이면 1. D-n 표기에 쓴다. */
  daysUntil: number
}

/**
 * 「다음 일정」 카드의 상대 시간. 문구 자체가 아니라 문구를 고를 재료를 돌려준다 —
 * 번역은 i18n이 하고, 이 함수는 판정만 한다.
 *
 * 오늘/내일은 남은 시간이 아니라 **날짜 경계**로 가른다. 밤 11시 50분에 열었을 때
 * 40분 뒤 일정을 "곧"이라고 하면 사람이 오늘 일로 읽는데, 실제로는 내일이다.
 *
 * @param now 'YYYY-MM-DDTHH:mm'. 호출자가 넘겨 테스트가 시계에 매이지 않게 한다.
 */
export function relativeWhen(date: string, startTime: string, now: string): RelativeWhen {
  const start = dayjs(`${date}T${startTime}`)
  const current = dayjs(now)

  const daysUntil = dayjs(date).startOf('day').diff(current.startOf('day'), 'day')
  const minutesUntil = start.diff(current, 'minute')

  const day: RelativeWhen['day'] = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : 'dday'

  return { day, minutesUntil, daysUntil }
}
