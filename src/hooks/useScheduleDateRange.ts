import { useEffect, useMemo } from 'react'
import { atom, useAtom } from 'jotai'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import dayjs from 'dayjs'
import { db } from '@/firebase'

export type DateRangePreset = 'rolling' | 'custom'

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

function rollingRange(today?: string): DateRange {
  const base = today ? dayjs(today) : dayjs()
  return {
    start: base.subtract(2, 'month').format('YYYY-MM-DD'),
    end: base.add(6, 'month').format('YYYY-MM-DD'),
  }
}

export function useScheduleDateRange(uid: string) {
  const [cache, setCache] = useAtom(_rangeCache)

  const setting: ScheduleDateRangeSetting = useMemo(
    () => cache?.uid === uid ? cache.setting : { preset: 'rolling' },
    [cache, uid],
  )
  const loading = cache?.uid !== uid
  const loadedForUid = cache?.uid ?? null

  useEffect(() => {
    if (loadedForUid === uid) return
    getDoc(doc(db, 'userSettings', uid))
      .then(snap => {
        const data = snap.data()
        const saved = (data?.scheduleDateRange as ScheduleDateRangeSetting) ?? { preset: 'rolling' }
        // Migrate legacy presets
        const migrated: ScheduleDateRangeSetting =
          (saved.preset === ('q1' as string) || saved.preset === ('q2' as string)) ? { preset: 'rolling' } : saved
        setCache({ uid, setting: migrated })
      })
      .catch(e => {
        console.error('[useScheduleDateRange] load failed:', e)
        setCache({ uid, setting: { preset: 'rolling' } })
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
    return rollingRange()
  }, [setting])

  return { setting, range, loading, save }
}
