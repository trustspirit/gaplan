import { atom } from 'jotai'
import type { InterviewReminder, MeetingReminder } from '@/utils/reminders'

export interface RemindersState {
  hasPending: boolean
  loaded: boolean // 전체 목록을 한 번이라도 로드했는지
  interviewReminders: InterviewReminder[]
  meetingReminders: MeetingReminder[]
  loading: boolean // 전체 목록 로딩 중
}

export const remindersAtom = atom<RemindersState>({
  hasPending: false,
  loaded: false,
  interviewReminders: [],
  meetingReminders: [],
  loading: false,
})

export const reminderHasAtom = atom(get => get(remindersAtom).hasPending)

/** RemindersSync가 useReminders.dismiss를 여기 실어 두어 TopBar 패널이 호출한다. */
export const reminderDismissAtom = atom<((key: string) => void) | null>(null)

/** RemindersSync가 useReminders.loadFull을 여기 실어 두어 벨/배너가 지연 로드를 트리거한다. */
export const reminderLoadAtom = atom<(() => void) | null>(null)
