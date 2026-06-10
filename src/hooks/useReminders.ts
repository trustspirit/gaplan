import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { fetchSchedulesInRange } from '@/services/scheduleService'
import { getDismissedReminders, dismissReminder } from '@/services/userSettingsService'
import {
  currentQuarter, computeInterviewReminders, computeMeetingReminders,
  type InterviewReminder, type MeetingReminder,
} from '@/utils/reminders'
import { ALL_UNITS } from '@/constants/regions'
import type { Schedule } from '@/types'

export function useReminders() {
  const user = useAtomValue(authUserAtom)
  const { users } = useUsers()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)
    const q = currentQuarter(today)
    const start = q.start < today ? q.start : today
    // 향후 120일까지의 일정만 조회 — 그 이후 방문의 모임 리마인더는 제외(허용 한계)
    const end = dayjs(today).add(120, 'day').format('YYYY-MM-DD')
    Promise.all([
      fetchSchedulesInRange(start, end),
      getDismissedReminders(user.uid),
    ]).then(([sched, dis]) => {
      if (!active) return
      setSchedules(sched); setDismissed(dis); setLoading(false)
    }).catch(() => { if (active) { setSchedules([]); setDismissed([]); setLoading(false) } })
    return () => { active = false }
  }, [user, today])

  const scopeUnits = useMemo(() => {
    if (!user) return [] as { id: string; name: string }[]
    if (user.role === 'admin') return ALL_UNITS.map(u => ({ id: u.id, name: u.name }))
    const regionIds = user.regionIds ?? (user.regionId ? [user.regionId] : [])
    return ALL_UNITS.filter(u => regionIds.includes(u.regionId)).map(u => ({ id: u.id, name: u.name }))
  }, [user])

  const presidentNameByUnit = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) {
      if (u.role === 'president' && u.unitId) m.set(u.unitId, u.name)
    }
    return m
  }, [users])

  const interviewReminders: InterviewReminder[] = useMemo(
    () => computeInterviewReminders(scopeUnits, presidentNameByUnit, schedules, today),
    [scopeUnits, presidentNameByUnit, schedules, today],
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
