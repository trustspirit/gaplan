import dayjs from 'dayjs'
import { ALL_UNITS } from '@/constants/regions'
import type { PublicWardVisitItem } from '@/types/publicSchedule'

/**
 * "방문 와드" 탭의 한 해. 휴대폰 카드와 데스크톱 표가 같은 데이터를 다른 모양으로 그린다.
 *
 * 달마다 칸 다섯 개(첫째~다섯째 일요일). 방문은 거의 일요일이라 일요일 기준으로 칸을 나누고,
 * 평일 방문은 ceil(일/7)번째 칸에 넣는다 — 일요일이면 그 일요일 칸과 같은 번호가 나온다.
 */

export interface WardVisitEntry {
  id: string
  date: string
  wardName: string
  unitId: string
  /** 0 = 일요일 */
  weekday: number
  /** 오늘 이후의 확정 방문. 오늘 방문은 예정이 아니다. */
  planned: boolean
}

export interface WardVisitSlot {
  /** 1..5 */
  index: number
  /** 그 달의 index번째 일요일. 그런 일요일이 없으면 null(다섯째 일요일이 없는 달). */
  sundayDate: string | null
  visits: WardVisitEntry[]
}

export interface WardVisitMonth {
  /** 1..12 */
  month: number
  /** YYYY-MM */
  key: string
  /** 언제나 5개 */
  slots: WardVisitSlot[]
  sundayCount: number
  visitCount: number
  isCurrent: boolean
}

const SLOT_COUNT = 5

function sundaysOf(year: number, month: number): string[] {
  const first = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const firstSunday = first.add((7 - first.day()) % 7, 'day')
  const out: string[] = []
  for (let d = firstSunday; d.month() === first.month(); d = d.add(7, 'day')) {
    out.push(d.format('YYYY-MM-DD'))
  }
  return out
}

export function buildWardVisitYear(
  visits: PublicWardVisitItem[],
  year: number,
  today: string,
): WardVisitMonth[] {
  const currentKey = today.slice(0, 7)
  const sorted = visits
    .filter((visit) => visit.date.startsWith(`${year}-`))
    .sort((a, b) => a.date.localeCompare(b.date))

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const key = `${year}-${String(month).padStart(2, '0')}`
    const sundays = sundaysOf(year, month)
    const slots: WardVisitSlot[] = Array.from({ length: SLOT_COUNT }, (_, s) => ({
      index: s + 1,
      sundayDate: sundays[s] ?? null,
      visits: [],
    }))
    let visitCount = 0
    for (const visit of sorted) {
      if (!visit.date.startsWith(`${key}-`)) continue
      const date = dayjs(visit.date)
      const slot = Math.min(Math.ceil(date.date() / 7), SLOT_COUNT)
      slots[slot - 1].visits.push({
        ...visit,
        weekday: date.day(),
        planned: visit.date > today,
      })
      visitCount += 1
    }
    return { month, key, slots, sundayCount: sundays.length, visitCount, isCurrent: key === currentKey }
  })
}

const STAKE_SUFFIX_KO = / (스테이크|지방부)$/
const STAKE_SUFFIX_EN = / (Stake|District)$/

/** 스테이크·지방부 이름에서 꼬리를 뗀 짧은 이름(서울동, 강릉). 모르는 id는 그대로. */
export function stakeShortName(unitId: string, lang: 'ko' | 'en'): string {
  const unit = ALL_UNITS.find((u) => u.id === unitId)
  if (!unit) return unitId
  return lang === 'en'
    ? unit.name.en.replace(STAKE_SUFFIX_EN, '')
    : unit.name.ko.replace(STAKE_SUFFIX_KO, '')
}
