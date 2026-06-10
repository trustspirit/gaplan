import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { fetchScopedSchedulesInRange } from '@/services/scheduleService'
import { computeVisitStats, type StatsFilters, type VisitStats } from '@/utils/visitStats'
import type { Schedule } from '@/types'

const FETCH_MONTHS = 24

export function useVisitStats(filters: StatsFilters) {
  const user = useAtomValue(authUserAtom)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const start = dayjs().subtract(FETCH_MONTHS, 'month').format('YYYY-MM-DD')
    const end = dayjs().format('YYYY-MM-DD')
    fetchScopedSchedulesInRange(start, end)
      .then(data => { if (active) { setSchedules(data); setLoading(false) } })
      .catch(() => { if (active) { setSchedules([]); setLoading(false) } })
    return () => { active = false }
    // 조회 윈도우는 고정 — 마운트 시 1회만 조회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allowedRegionIds = useMemo<string[] | null>(() => {
    if (!user || user.role === 'admin') return null
    return user.regionIds ?? (user.regionId ? [user.regionId] : [])
  }, [user])

  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  const stats: VisitStats = useMemo(
    () => computeVisitStats(schedules, filters, allowedRegionIds, today),
    [schedules, filters, allowedRegionIds, today],
  )

  return { stats, loading }
}
