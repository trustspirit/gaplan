import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { fetchScopedSchedulesInRange } from '@/services/scheduleService'
import { getDismissedReminders, dismissReminder } from '@/services/userSettingsService'
import {
  currentQuarter, computeInterviewReminders, computeMeetingReminders,
  type InterviewReminder, type MeetingReminder,
} from '@/utils/reminders'
import { ALL_UNITS } from '@/constants/regions'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { SCOPE_ALL } from '@/utils/scope'
import type { Schedule } from '@/types'

export function useReminders() {
  const user = useAtomValue(authUserAtom)
  const { users } = useUsers()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const scope = useEffectiveScope()
  const viewSeventyUid = useAtomValue(seventyViewAtom)

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)
    const q = currentQuarter(today)
    const start = q.start < today ? q.start : today
    // 향후 120일까지의 일정만 조회 — 그 이후 방문의 모임 리마인더는 제외(허용 한계)
    const end = dayjs(today).add(120, 'day').format('YYYY-MM-DD')
    // For admin: resolve the effective seventy uid for the server query.
    // null viewSeventyUid + assignedSeventyUid → use assignedSeventyUid (admin+exec_sec default)
    // SCOPE_ALL or no assignedSeventyUid → null → server returns all
    const querySeventyUid: string | null =
      user.role === 'admin'
        ? (viewSeventyUid === SCOPE_ALL ? null : (viewSeventyUid ?? user.assignedSeventyUid ?? null))
        : null
    Promise.all([
      fetchScopedSchedulesInRange(start, end, user.role === 'admin' ? querySeventyUid : undefined),
      getDismissedReminders(user.uid),
    ]).then(([sched, dis]) => {
      if (!active) return
      setSchedules(sched); setDismissed(dis); setLoading(false)
    }).catch(() => { if (active) { setSchedules([]); setDismissed([]); setLoading(false) } })
    return () => { active = false }
  }, [user, today, viewSeventyUid])

  const scopeUnits = useMemo(() => {
    if (!user) return [] as { id: string; name: string }[]
    if (scope.regionIds === null) return ALL_UNITS.map(u => ({ id: u.id, name: u.name }))
    const allowed = new Set(scope.regionIds)
    return ALL_UNITS.filter(u => allowed.has(u.regionId)).map(u => ({ id: u.id, name: u.name }))
  }, [scope])

  const presidentNameByUnit = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) {
      if (u.role === 'president' && u.unitId) m.set(u.unitId, u.name)
    }
    return m
  }, [users])

  const interviewReminders: InterviewReminder[] = useMemo(
    () => computeInterviewReminders(scopeUnits, presidentNameByUnit, schedules, new Set(dismissed), today),
    [scopeUnits, presidentNameByUnit, schedules, dismissed, today],
  )

  const scopeUnitIds = useMemo(() => new Set(scopeUnits.map(u => u.id)), [scopeUnits])
  const meetingReminders: MeetingReminder[] = useMemo(() => {
    const wardVisits = schedules.filter(s => s.type === 'ward_visit' && scopeUnitIds.has(s.unitId))
    const meetings = schedules.filter(s => s.type === 'meeting' && scopeUnitIds.has(s.unitId))
    return computeMeetingReminders(wardVisits, meetings, new Set(dismissed), today)
  }, [schedules, scopeUnitIds, dismissed, today])

  const dismiss = async (key: string) => {
    if (!user) return
    setDismissed(prev => [...prev, key])
    await dismissReminder(user.uid, key)
  }

  return { loading, interviewReminders, meetingReminders, dismiss }
}
