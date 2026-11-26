import dayjs from 'dayjs'

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

/**
 * 오늘부터 그 날짜까지 남은 날 수(달력 기준). 지났으면 음수.
 * 시각째로 빼면 내일 마감이 오전에는 0일로 내려가 "D-0"이 된다 — 날짜끼리 뺀다.
 */
export function daysUntil(date: string, now: dayjs.ConfigType = undefined): number {
  return dayjs(date).startOf('day').diff(dayjs(now).startOf('day'), 'day')
}
