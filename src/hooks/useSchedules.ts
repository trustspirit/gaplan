import { useEffect, useMemo, useState } from 'react'
import { subscribeToSchedules, subscribeToSeventyNotes } from '@/services/scheduleService'
import type { Schedule } from '@/types'

interface UseSchedulesOptions { presidentUid?: string; seventyUid?: string }

export function useSchedules(options: UseSchedulesOptions) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const unsub = subscribeToSchedules(
      options,
      (data, fromCache) => {
        setSchedules(data)
        if (!fromCache) setLoading(false)
      },
      err => { setError(err.message); setLoading(false) },
    )
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.presidentUid, options.seventyUid])

  // 칠십인 전용 메모는 일정 문서가 아니라 별도 컬렉션에 있다. 회장으로 조회할 때는 읽을 권한이
  // 없으므로 아예 구독하지 않는다. 그 밖의 경우(칠십인·집행서기는 seventyUid로, 관리자는 전체)에
  // 구독해 일정에 붙여 준다 — 화면들은 schedule.seventyNotes만 보면 된다.
  const [seventyNotes, setSeventyNotes] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    if (options.presidentUid) {
      setSeventyNotes(new Map())
      return
    }
    return subscribeToSeventyNotes({ seventyUid: options.seventyUid }, setSeventyNotes)
  }, [options.presidentUid, options.seventyUid])

  const withNotes = useMemo(
    () =>
      seventyNotes.size === 0
        ? schedules
        : schedules.map((s) => {
            const notes = seventyNotes.get(s.id)
            return notes ? { ...s, seventyNotes: notes } : s
          }),
    [schedules, seventyNotes],
  )

  return { schedules: withNotes, loading, error }
}
