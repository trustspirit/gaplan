/**
 * Greedy bipartite-matching scheduler.
 *
 * Given a list of respondents (each with their available slots),
 * find a conflict-free assignment: one slot per respondent, no two
 * respondents sharing the same (date, startTime).
 *
 * Returns null if no complete assignment is possible.
 *
 * Strategy parameter controls how slots are prioritised within each round:
 *   'earliest'  — sort slots ascending by date/time
 *   'afternoon' — prefer slots at or after 13:00
 *   'spread'    — spread across as many different dates as possible
 */

export interface Respondent {
  uid: string
  name: string
  taskId: string
  availableSlots: { date: string; startTime: string; endTime: string }[]
}

export interface Assignment {
  respondent: Respondent
  slot: { date: string; startTime: string; endTime: string }
}

export interface SuggestionOption {
  label: string
  assignments: Assignment[]
  unassigned: Respondent[]
}

type Strategy = 'earliest' | 'afternoon' | 'spread'

function slotKey(date: string, startTime: string): string {
  return `${date}_${startTime}`
}

function sortSlots(
  slots: { date: string; startTime: string; endTime: string }[],
  strategy: Strategy,
  usedDates: Set<string>,
): { date: string; startTime: string; endTime: string }[] {
  return [...slots].sort((a, b) => {
    if (strategy === 'earliest') {
      const cmp = a.date.localeCompare(b.date)
      return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime)
    }
    if (strategy === 'afternoon') {
      const aAfternoon = a.startTime >= '13:00' ? 0 : 1
      const bAfternoon = b.startTime >= '13:00' ? 0 : 1
      if (aAfternoon !== bAfternoon) return aAfternoon - bAfternoon
      return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    }
    // spread: prefer dates not yet used by other assigned slots
    const aUsed = usedDates.has(a.date) ? 1 : 0
    const bUsed = usedDates.has(b.date) ? 1 : 0
    if (aUsed !== bUsed) return aUsed - bUsed
    return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  })
}

function greedyAssign(respondents: Respondent[], strategy: Strategy): SuggestionOption['assignments'] {
  // Sort respondents: most-constrained first (fewest available slots)
  const sorted = [...respondents].sort((a, b) => a.availableSlots.length - b.availableSlots.length)

  const occupied = new Set<string>()
  const usedDates = new Set<string>()
  const assignments: Assignment[] = []

  for (const r of sorted) {
    const prioritised = sortSlots(r.availableSlots, strategy, usedDates)
    for (const slot of prioritised) {
      const key = slotKey(slot.date, slot.startTime)
      if (!occupied.has(key)) {
        occupied.add(key)
        usedDates.add(slot.date)
        assignments.push({ respondent: r, slot })
        break
      }
    }
  }

  return assignments
}

export function generateSuggestions(respondents: Respondent[]): SuggestionOption[] {
  if (respondents.length === 0) return []

  const strategies: { strategy: Strategy; label: string }[] = [
    { strategy: 'earliest',  label: '1안 — 가장 이른 날짜 우선' },
    { strategy: 'afternoon', label: '2안 — 오후 시간 우선' },
    { strategy: 'spread',    label: '3안 — 날짜 분산 우선' },
  ]

  return strategies.map(({ strategy, label }) => {
    const assignments = greedyAssign(respondents, strategy)
    const assignedUids = new Set(assignments.map(a => a.respondent.uid))
    const unassigned = respondents.filter(r => !assignedUids.has(r.uid))
    return { label, assignments, unassigned }
  })
}
