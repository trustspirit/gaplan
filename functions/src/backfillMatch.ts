import { getWardIdByName } from './regions'

export interface BackfillMeeting {
  id: string
  seventyUid: string
  date: string
  wardId?: string | null
}

export interface BackfillVisit {
  id: string
  seventyUid: string
  date: string
  wardId?: string | null
  wardName?: string | null
}

/**
 * 기존 ward_bishop 모임에 붙일 방문을 고른다.
 * 같은 칠십인 + 같은 와드 + 모임 날짜 이후 방문 중 가장 가까운 하나.
 * 와드 동일성은 기존 판정과 같은 규칙(방문의 wardId ?? wardName 역조회)으로 본다.
 */
export function matchVisitForMeeting(
  meeting: BackfillMeeting,
  visits: BackfillVisit[],
): string | null {
  if (!meeting.wardId) return null

  const candidates = visits
    .filter(v => v.seventyUid === meeting.seventyUid && v.date >= meeting.date)
    .filter(v => {
      const wid = v.wardId ?? (v.wardName ? getWardIdByName(v.wardName) : undefined)
      return wid === meeting.wardId
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  return candidates[0]?.id ?? null
}
