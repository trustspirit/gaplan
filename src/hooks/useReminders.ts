import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { fetchScopedSchedulesInRange, fetchRemindersPresence } from '@/services/scheduleService'
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
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [hasPending, setHasPending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const scope = useEffectiveScope()
  const viewSeventyUid = useAtomValue(seventyViewAtom)

  const querySeventyUid = useMemo(() => {
    return resolveAdminViewSeventyUid(user, viewSeventyUid)
  }, [user, viewSeventyUid])

  // 마운트 시 존재 여부만 저렴하게 확인 — 전체 목록은 loadFull()로 지연 로드한다.
  useEffect(() => {
    if (!user) return
    let active = true
    fetchRemindersPresence(user.role === 'admin' ? querySeventyUid : undefined)
      .then(h => { if (active) setHasPending(h) })
      .catch(() => {})
    return () => { active = false }
  }, [user, querySeventyUid])

  const loadFull = useCallback(async () => {
    if (!user || loaded) return
    setSchedulesLoading(true)
    const q = currentQuarter(today)
    // 방문 전 준비 모임(감독단 모임 등)은 분기 시작 이전에 잡혀 있을 수 있으므로 60일 여유를 두고 과거까지 조회
    const lookbackStart = dayjs(today).subtract(60, 'day').format('YYYY-MM-DD')
    const start = q.start < lookbackStart ? q.start : lookbackStart
    // 향후 120일까지의 일정만 조회 — 그 이후 방문의 모임 리마인더는 제외(허용 한계)
    const end = dayjs(today).add(120, 'day').format('YYYY-MM-DD')
    try {
      const [sched, dis] = await Promise.all([
        fetchScopedSchedulesInRange(start, end, user.role === 'admin' ? querySeventyUid : undefined),
        getDismissedReminders(user.uid),
      ])
      setSchedules(sched); setDismissed(dis); setLoaded(true)
    } catch {
      toast.error('리마인더 데이터를 불러오지 못했습니다.')
    } finally {
      setSchedulesLoading(false)
    }
  }, [user, loaded, today, querySeventyUid])

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

  // 전체 목록이 로드된 뒤에는 해제(dismiss) 등을 반영해 실제 잔여 리마인더 유무로 존재 상태를 재계산한다.
  useEffect(() => {
    if (!loaded) return
    setHasPending(interviewReminders.length + meetingReminders.length > 0)
  }, [loaded, interviewReminders, meetingReminders])

  const dismiss = async (key: string) => {
    if (!user) return
    setDismissed(prev => [...prev, key])
    await dismissReminder(user.uid, key)
  }

  const loading = schedulesLoading || usersLoading

  return { hasPending, loaded, loading, interviewReminders, meetingReminders, loadFull, dismiss }
}
