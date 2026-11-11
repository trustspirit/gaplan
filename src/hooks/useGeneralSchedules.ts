import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { subscribeToGeneralSchedules, subscribeToGeneralSeventyNotes } from '@/services/generalScheduleService'
import { isGeneralScheduleRelevant } from '@/types'
import { authUserAtom } from '@/store/authAtom'
import type { GeneralSchedule } from '@/types'
import { canSeeSeventyOnlyEvents } from '@/utils/permissions'

export function useGeneralSchedules() {
  const user = useAtomValue(authUserAtom)
  const [all, setAll] = useState<GeneralSchedule[]>([])
  const [loading, setLoading] = useState(true)

  // 회장 등은 칠십인 전용 행사를 뺀 조회만 규칙을 통과한다 — 역할이 정해지면 그에 맞춰 다시 구독한다.
  const includeSeventyOnly = canSeeSeventyOnlyEvents(user)

  useEffect(() => {
    const unsub = subscribeToGeneralSchedules(
      data => {
        setAll(data)
        setLoading(false)
      },
      () => setLoading(false),   // 권한/쿼리 오류 시에도 로딩 해제 (무한 로딩 방지)
      { includeSeventyOnly },
    )
    return unsub
  }, [includeSeventyOnly])

  // 칠십인 전용 메모는 행사 문서가 아니라 별도 컬렉션에 있다. 읽을 수 있는 역할일 때만 구독해
  // 행사에 붙여 준다 — 화면들은 event.seventyNotes만 보면 된다.
  const [seventyNotes, setSeventyNotes] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    if (!includeSeventyOnly) {
      setSeventyNotes(new Map())
      return
    }
    return subscribeToGeneralSeventyNotes(setSeventyNotes)
  }, [includeSeventyOnly])

  const allWithNotes = useMemo(
    () =>
      seventyNotes.size === 0
        ? all
        : all.map((gs) => {
            const notes = seventyNotes.get(gs.id)
            return notes ? { ...gs, seventyNotes: notes } : gs
          }),
    [all, seventyNotes],
  )

  const generalSchedules = user
    ? allWithNotes.filter(gs => isGeneralScheduleRelevant(gs, user))
    : []

  return { generalSchedules, allGeneralSchedules: allWithNotes, loading }
}
