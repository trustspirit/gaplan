import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { db } from '@/firebase'
import { REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui'
import styles from './CalendarSettings.module.scss'

export function CalendarSettings() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [calendarIds, setCalendarIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'calendar')).then(snap => {
      const data = snap.data()
      if (data?.calendars) setCalendarIds(data.calendars as Record<string, string>)
    }).finally(() => setFetching(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await setDoc(doc(db, 'settings', 'calendar'), { calendars: calendarIds }, { merge: true })
      toast.success(t('admin.calendarSaved'))
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('admin.calendar')} />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title={t('admin.calendar')} />
          <CardBody>
            <p className={styles.desc}>
              각 지역별로 공유 캘린더를 생성하고, Google Calendar 설정에서 캘린더 ID를 복사해 입력하세요.
              확정된 일정이 해당 지역 캘린더에 자동으로 기록됩니다.
            </p>
            {fetching ? (
              <p className={styles.desc}>불러오는 중...</p>
            ) : (
              <form className={styles.form} onSubmit={handleSave}>
                {REGIONS.map(region => (
                  <Input
                    key={region.id}
                    label={`${region.name} 지역 캘린더 ID`}
                    value={calendarIds[region.id] ?? ''}
                    onChange={e => setCalendarIds(prev => ({ ...prev, [region.id]: e.target.value }))}
                    placeholder="xxxxxxxx@group.calendar.google.com"
                  />
                ))}
                <Button type="submit" loading={loading}>저장</Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
