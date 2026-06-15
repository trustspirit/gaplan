import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { fetchScopedSchedulesInRange } from '@/services/scheduleService'
import { computeVisitStats, type StatsFilters, type VisitStats } from '@/utils/visitStats'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import type { Schedule } from '@/types'

const FETCH_MONTHS = 24

export function useVisitStats(filters: StatsFilters) {
  const user = useAtomValue(authUserAtom)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const scope = useEffectiveScope()
  const viewSeventyUid = useAtomValue(seventyViewAtom)

  useEffect(() => {
    let active = true
    setLoading(true)
    const start = dayjs().subtract(FETCH_MONTHS, 'month').format('YYYY-MM-DD')
    const end = dayjs().add(12, 'month').format('YYYY-MM-DD')
    fetchScopedSchedulesInRange(start, end, user?.role === 'admin' ? viewSeventyUid : undefined)
      .then(data => { if (active) { setSchedules(data); setLoading(false) } })
      .catch(() => { if (active) { setSchedules([]); setLoading(false) } })
    return () => { active = false }
  }, [viewSeventyUid, user?.role])

  const allowedRegionIds = useMemo<string[] | null>(() => scope.regionIds, [scope])

  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  const stats: VisitStats = useMemo(
    () => computeVisitStats(schedules, filters, allowedRegionIds, today),
    [schedules, filters, allowedRegionIds, today],
  )

  return { stats, loading }
}
