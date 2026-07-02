import { atom } from 'jotai'
import type { InterviewReminder, MeetingReminder } from '@/utils/reminders'

export interface RemindersState {
  interviewReminders: InterviewReminder[]
  meetingReminders: MeetingReminder[]
  loading: boolean
}

export const remindersAtom = atom<RemindersState>({
  interviewReminders: [],
  meetingReminders: [],
  loading: true,
})

export const reminderCountAtom = atom(
  get => {
    const r = get(remindersAtom)
    return r.interviewReminders.length + r.meetingReminders.length
  },
)

/** RemindersSync가 useReminders.dismiss를 여기 실어 두어 TopBar 패널이 호출한다. */
export const reminderDismissAtom = atom<((key: string) => void) | null>(null)
