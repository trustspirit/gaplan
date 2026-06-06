import { useEffect, useMemo } from 'react'
import { atom, useAtom } from 'jotai'
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

interface RangeCache {
  uid: string
  setting: ScheduleDateRangeSetting
}

// Module-level atom — shared across all page instances, single Firestore read per session
const _rangeCache = atom<RangeCache | null>(null)

function presetRange(preset: 'q1' | 'q2', year: number): DateRange {
  return preset === 'q1'
    ? { start: `${year}-01-01`, end: `${year}-06-30` }
    : { start: `${year}-07-01`, end: `${year}-12-31` }
}

export function useScheduleDateRange(uid: string) {
  const [cache, setCache] = useAtom(_rangeCache)
  const currentYear = dayjs().year()
  const defaultPreset: DateRangePreset = (dayjs().month() + 1) <= 6 ? 'q1' : 'q2'

  const setting: ScheduleDateRangeSetting =
    cache?.uid === uid ? cache.setting : { preset: defaultPreset }
  const loading = cache?.uid !== uid
  const loadedForUid = cache?.uid ?? null

  useEffect(() => {
    if (loadedForUid === uid) return
    getDoc(doc(db, 'userSettings', uid))
      .then(snap => {
        const data = snap.data()
        const saved = (data?.scheduleDateRange as ScheduleDateRangeSetting) ?? { preset: defaultPreset }
        setCache({ uid, setting: saved })
      })
      .catch(e => {
        console.error('[useScheduleDateRange] load failed:', e)
        setCache({ uid, setting: { preset: defaultPreset } })
      })
  }, [uid, loadedForUid]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (next: ScheduleDateRangeSetting) => {
    const prev = cache
    setCache({ uid, setting: next })
    try {
      await setDoc(doc(db, 'userSettings', uid), { scheduleDateRange: next }, { merge: true })
    } catch (e) {
      setCache(prev)
      console.error('[useScheduleDateRange] save failed:', e)
    }
  }

  const range = useMemo((): DateRange => {
    if (setting.preset === 'custom' && setting.customStart && setting.customEnd)
      return { start: setting.customStart, end: setting.customEnd }
    const activePreset = setting.preset === 'custom' ? defaultPreset : setting.preset
    return presetRange(activePreset, currentYear)
  }, [setting, currentYear, defaultPreset])

  return { setting, range, loading, save }
}
