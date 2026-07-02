import { useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { useReminders } from '@/hooks/useReminders'
import { remindersAtom, reminderDismissAtom } from '@/store/remindersAtom'

/** ProtectedRoute(영속 부모)에 1회 마운트. 역할 게이트 후 내부 훅을 돌린다. */
export function RemindersSync() {
  const user = useAtomValue(authUserAtom)
  const enabled =
    !!user && (user.role === 'seventy' || user.role === 'admin' || user.role === 'exec_secretary')
  if (!enabled) return null
  return <RemindersSyncInner />
}

function RemindersSyncInner() {
  const { interviewReminders, meetingReminders, loading, dismiss } = useReminders()
  const setReminders = useSetAtom(remindersAtom)
  const setDismiss = useSetAtom(reminderDismissAtom)

  useEffect(() => {
    setReminders({ interviewReminders, meetingReminders, loading })
  }, [interviewReminders, meetingReminders, loading, setReminders])

  useEffect(() => {
    // 함수 값을 그대로 저장 (updater 형태)
    setDismiss(() => dismiss)
  }, [dismiss, setDismiss])

  return null
}
