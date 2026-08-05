import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { fetchScopedSchedulesInRange } from '@/services/scheduleService'
import type { Schedule } from '@/types'

export interface UpcomingVisit {
  id: string
  date: string
  wardName: string
  unitId: string
  wardId?: string
}

/** 사전 모임 대상이 될 수 있는 방문만 골라 가까운 순으로 돌려준다. */
export function selectUpcomingVisits(
  schedules: Schedule[],
  seventyUid: string,
  fromDate: string,
): UpcomingVisit[] {
  return schedules
    .filter(s =>
      s.type === 'ward_visit' &&
      s.seventyUid === seventyUid &&
      s.status !== 'cancelled' &&
      s.date >= fromDate,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      id: s.id,
      date: s.date,
      wardName: s.wardName ?? '',
      unitId: s.unitId,
      ...(s.wardId ? { wardId: s.wardId } : {}),
    }))
}

/** 선택 가능한 예정 방문 목록. fromDate 이후 1년치를 조회한다. */
export function useUpcomingVisits(seventyUid: string, fromDate: string) {
  const [visits, setVisits] = useState<UpcomingVisit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!seventyUid || !fromDate) { setVisits([]); setLoading(false); return }
    let active = true
    setLoading(true)
    const end = dayjs(fromDate).add(365, 'day').format('YYYY-MM-DD')
    fetchScopedSchedulesInRange(fromDate, end, seventyUid)
      .then(list => { if (active) setVisits(selectUpcomingVisits(list, seventyUid, fromDate)) })
      .catch(() => { if (active) setVisits([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [seventyUid, fromDate])

  return { visits, loading }
}
