import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase'
import { fetchSchedulesInRange } from '@/services/scheduleService'
import { useGeneralSchedules } from '@/hooks/useGeneralSchedules'
import { computeVisitStats, type LastVisitEntry } from '@/utils/visitStats'
import { computeUnitBalance, type BalanceEntry } from '@/utils/visitPlanContext'
import { ALL_UNITS } from '@/constants/regions'
import type { Schedule, VisitPlanItem } from '@/types'

const FETCH_MONTHS = 24
const BALANCE_MONTHS = 6

export function useVisitPlanContext(seventyUid: string | undefined, planItems: VisitPlanItem[]) {
  const { allGeneralSchedules } = useGeneralSchedules()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [regionIds, setRegionIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  useEffect(() => {
    if (!seventyUid) { setLoading(false); return }
    let active = true
    setLoading(true)
    const start = dayjs().subtract(FETCH_MONTHS, 'month').format('YYYY-MM-DD')
    Promise.all([
      fetchSchedulesInRange(start, today),
      getDoc(doc(db, 'users', seventyUid)),
    ]).then(([sched, userSnap]) => {
      if (!active) return
      setSchedules(sched)
      const u = userSnap.data()
      setRegionIds(u?.regionIds ?? (u?.regionId ? [u.regionId] : []))
      setLoading(false)
    }).catch(() => { if (active) { setSchedules([]); setRegionIds([]); setLoading(false) } })
    return () => { active = false }
  }, [seventyUid, today])

  // 와드 밀린 순 (통계 재사용; period는 lastVisit에 영향 없음)
  const staleWards: LastVisitEntry[] = useMemo(() => {
    if (!regionIds.length) return []
    const stats = computeVisitStats(
      schedules,
      { regionId: 'all', period: '6m', granularity: 'ward' },
      regionIds,
      today,
    )
    return [...stats.lastVisit].sort((a, b) => {
      if (a.daysSince === null && b.daysSince === null) return a.name.localeCompare(b.name)
      if (a.daysSince === null) return -1
      if (b.daysSince === null) return 1
      return b.daysSince - a.daysSince
    })
  }, [schedules, regionIds, today])

  const lastVisitByWard = useMemo(() => {
    const m = new Map<string, LastVisitEntry>()
    for (const w of staleWards) m.set(w.name, w)
    return m
  }, [staleWards])

  // 균형: 칠십인 담당 unit
  const balance: BalanceEntry[] = useMemo(() => {
    const units = ALL_UNITS
      .filter(u => regionIds.includes(u.regionId))
      .map(u => ({ id: u.id, name: u.name }))
    const since = dayjs(today).subtract(BALANCE_MONTHS, 'month').format('YYYY-MM-DD')
    return computeUnitBalance(units, schedules, planItems, since, today)
  }, [regionIds, schedules, planItems, today])

  return { loading, staleWards, lastVisitByWard, balance, generalSchedules: allGeneralSchedules, regionIds }
}
