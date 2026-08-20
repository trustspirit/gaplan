import { useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { useReminders } from '@/hooks/useReminders'
import { isRemindersEligible } from '@/utils/reminders'
import { remindersAtom, reminderDismissAtom, reminderLoadAtom } from '@/store/remindersAtom'

/** ProtectedRoute(영속 부모)에 1회 마운트. 역할 게이트 후 내부 훅을 돌린다. */
export function RemindersSync() {
  const user = useAtomValue(authUserAtom)
  if (!isRemindersEligible(user)) return null
  return <RemindersSyncInner />
}

function RemindersSyncInner() {
  const { hasPending, presenceLoading, loaded, loading, interviewReminders, meetingReminders, loadFull, dismiss } = useReminders()
  const setReminders = useSetAtom(remindersAtom)
  const setDismiss = useSetAtom(reminderDismissAtom)
  const setLoad = useSetAtom(reminderLoadAtom)

  useEffect(() => {
    setReminders({ hasPending, presenceLoading, loaded, loading, interviewReminders, meetingReminders })
  }, [hasPending, presenceLoading, loaded, loading, interviewReminders, meetingReminders, setReminders])

  useEffect(() => {
    // 함수 값을 그대로 저장 (updater 형태)
    setDismiss(() => dismiss)
  }, [dismiss, setDismiss])

  useEffect(() => {
    setLoad(() => loadFull)
  }, [loadFull, setLoad])

  return null
}
