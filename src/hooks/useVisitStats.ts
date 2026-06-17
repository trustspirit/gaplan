import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { fetchScopedSchedulesInRange } from '@/services/scheduleService'
import { computeVisitStats, type StatsFilters, type VisitStats } from '@/utils/visitStats'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { resolveAdminViewSeventyUid } from '@/utils/scope'
import type { Schedule } from '@/types'

const FETCH_MONTHS = 24

export function useVisitStats(filters: StatsFilters) {
  const user = useAtomValue(authUserAtom)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const scope = useEffectiveScope()
  const viewSeventyUid = useAtomValue(seventyViewAtom)
  const querySeventyUid = useMemo(
    () => resolveAdminViewSeventyUid(user, viewSeventyUid),
    [user, viewSeventyUid],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    const start = dayjs().subtract(FETCH_MONTHS, 'month').format('YYYY-MM-DD')
    const end = dayjs().add(12, 'month').format('YYYY-MM-DD')
    fetchScopedSchedulesInRange(start, end, user?.role === 'admin' ? querySeventyUid : undefined)
      .then(data => { if (active) { setSchedules(data); setError(null); setLoading(false) } })
      .catch((e: Error) => { if (active) { setSchedules([]); setError(e); setLoading(false) } })
    return () => { active = false }
  }, [querySeventyUid, reloadKey, user?.role])

  const allowedRegionIds = useMemo<string[] | null>(() => scope.regionIds, [scope])

  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  const stats: VisitStats = useMemo(
    () => computeVisitStats(schedules, filters, allowedRegionIds, today, { actingSeventyUid: scope.actingSeventyUid }),
    [schedules, filters, allowedRegionIds, today, scope.actingSeventyUid],
  )

  return {
    stats,
    loading,
    error,
    reload: () => setReloadKey(key => key + 1),
  }
}
