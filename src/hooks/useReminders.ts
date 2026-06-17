import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { fetchScopedSchedulesInRange, subscribeToSchedules } from '@/services/scheduleService'
import { getDismissedReminders, dismissReminder } from '@/services/userSettingsService'
import {
  currentQuarter, computeInterviewReminders, computeMeetingReminders,
  selectMeetingReminderSchedules, type InterviewReminder, type MeetingReminder,
} from '@/utils/reminders'
import { ALL_UNITS } from '@/constants/regions'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { resolveAdminViewSeventyUid } from '@/utils/scope'
import type { Schedule } from '@/types'

export function useReminders() {
  const user = useAtomValue(authUserAtom)
  const { users, loading: usersLoading } = useUsers()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [scheduleVersion, setScheduleVersion] = useState(0)
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const scope = useEffectiveScope()
  const viewSeventyUid = useAtomValue(seventyViewAtom)

  const querySeventyUid = useMemo(() => {
    return resolveAdminViewSeventyUid(user, viewSeventyUid)
  }, [user, viewSeventyUid])

  // Subscribe to schedule changes so the CF-fetched reminder data stays fresh after CRUD.
  // Skip the first non-cache fire (initial load) to avoid a double-fetch on mount.
  const scheduleSubSeenFirst = useRef(false)
  useEffect(() => {
    if (!user) return
    scheduleSubSeenFirst.current = false
    const opts =
      user.role === 'president' ? { presidentUid: user.uid }
      : user.role === 'seventy' ? { seventyUid: user.uid }
      : user.role === 'exec_secretary' ? { seventyUid: user.assignedSeventyUid || undefined }
      : querySeventyUid ? { seventyUid: querySeventyUid }
      : {}
    return subscribeToSchedules(opts, (_, fromCache) => {
      if (fromCache) return
      if (!scheduleSubSeenFirst.current) { scheduleSubSeenFirst.current = true; return }
      setScheduleVersion(v => v + 1)
    })
  }, [user, querySeventyUid])

  useEffect(() => {
    if (!user) return
    let active = true
    setSchedulesLoading(true)
    const q = currentQuarter(today)
    const start = q.start < today ? q.start : today
    // 향후 120일까지의 일정만 조회 — 그 이후 방문의 모임 리마인더는 제외(허용 한계)
    const end = dayjs(today).add(120, 'day').format('YYYY-MM-DD')
    Promise.all([
      fetchScopedSchedulesInRange(start, end, user.role === 'admin' ? querySeventyUid : undefined),
      getDismissedReminders(user.uid),
    ]).then(([sched, dis]) => {
      if (!active) return
      setSchedules(sched); setDismissed(dis); setSchedulesLoading(false)
    }).catch(() => {
      if (!active) return
      setSchedules([]); setDismissed([]); setSchedulesLoading(false)
      toast.error('리마인더 데이터를 불러오지 못했습니다.')
    })
    return () => { active = false }
  }, [user, today, viewSeventyUid, querySeventyUid, scheduleVersion])

  const scopeUnits = useMemo(() => {
    if (!user) return [] as { id: string; name: string }[]
    if (scope.regionIds === null) return ALL_UNITS.map(u => ({ id: u.id, name: u.name.ko }))
    const allowed = new Set(scope.regionIds)
    return ALL_UNITS.filter(u => allowed.has(u.regionId)).map(u => ({ id: u.id, name: u.name.ko }))
  }, [scope, user])

  const presidentNameByUnit = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) {
      if ((u.role === 'president' || (u.role === 'admin' && u.secondaryRole === 'president')) && u.unitId)
        m.set(u.unitId, u.name)
    }
    return m
  }, [users])

  const interviewReminders: InterviewReminder[] = useMemo(
    () => computeInterviewReminders(scopeUnits, presidentNameByUnit, schedules, new Set(dismissed), today),
    [scopeUnits, presidentNameByUnit, schedules, dismissed, today],
  )

  const scopeUnitIds = useMemo(() => new Set(scopeUnits.map(u => u.id)), [scopeUnits])
  const meetingReminders: MeetingReminder[] = useMemo(() => {
    const { wardVisits, meetings } = selectMeetingReminderSchedules(
      schedules,
      scopeUnitIds,
      scope.actingSeventyUid,
    )
    return computeMeetingReminders(wardVisits, meetings, new Set(dismissed), today)
  }, [schedules, scopeUnitIds, scope.actingSeventyUid, dismissed, today])

  const dismiss = async (key: string) => {
    if (!user) return
    setDismissed(prev => [...prev, key])
    await dismissReminder(user.uid, key)
  }

  const loading = schedulesLoading || usersLoading

  return { loading, interviewReminders, meetingReminders, dismiss }
}
