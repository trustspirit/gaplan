import { useEffect, useState, useMemo } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import dayjs from 'dayjs'
import { db } from '@/firebase'

export type DateRangePreset = 'q1' | 'q2' | 'custom'

export interface ScheduleDateRangeSetting {
  preset: DateRangePreset
  customStart?: string
  customEnd?: string
}

export interface DateRange {
  start: string
  end: string
}

function presetRange(preset: 'q1' | 'q2', year: number): DateRange {
  return preset === 'q1'
    ? { start: `${year}-01-01`, end: `${year}-06-30` }
    : { start: `${year}-07-01`, end: `${year}-12-31` }
}

export function useScheduleDateRange(uid: string) {
  const currentYear = dayjs().year()
  const currentMonth = dayjs().month() + 1
  const defaultPreset: DateRangePreset = currentMonth <= 6 ? 'q1' : 'q2'

  const [setting, setSetting] = useState<ScheduleDateRangeSetting>({ preset: defaultPreset })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'userSettings', uid))
      .then(snap => {
        const data = snap.data()
        if (data?.scheduleDateRange) setSetting(data.scheduleDateRange as ScheduleDateRangeSetting)
      })
      .finally(() => setLoading(false))
  }, [uid])

  const save = async (next: ScheduleDateRangeSetting) => {
    setSetting(next)
    await setDoc(doc(db, 'userSettings', uid), { scheduleDateRange: next }, { merge: true })
  }

  const range = useMemo((): DateRange => {
    if (setting.preset === 'custom' && setting.customStart && setting.customEnd)
      return { start: setting.customStart, end: setting.customEnd }
    const activePreset = setting.preset === 'custom' ? defaultPreset : setting.preset
    return presetRange(activePreset, currentYear)
  }, [setting, currentYear, defaultPreset])

  return { setting, range, loading, save }
}
