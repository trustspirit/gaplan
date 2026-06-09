import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { manualCalendarSync } from '@/services/scheduleService'
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
  const [syncing, setSyncing] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'calendar'))
      .then((snap) => {
        const data = snap.data()
        if (data?.calendars) setCalendarIds(data.calendars as Record<string, string>)
      })
      .finally(() => setFetching(false))
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

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const result = await manualCalendarSync()
      toast.success(result.message)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('common.syncError'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AppShell
      role={user.role}
      name={user.name}
      topBar={<TopBar name={user.name} subtext={t('admin.calendar')} />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title={t('admin.calendar')} />
          <CardBody>
            <p className={styles.desc}>{t('admin.calendarDesc2')}</p>
            {fetching ? (
              <p className={styles.desc}>{t('common.loading')}</p>
            ) : (
              <form className={styles.form} onSubmit={handleSave}>
                {REGIONS.map((region) => (
                  <Input
                    key={region.id}
                    label={`${region.name} ${t('admin.calendarRegionLabel')}`}
                    value={calendarIds[region.id] ?? ''}
                    onChange={(e) =>
                      setCalendarIds((prev) => ({ ...prev, [region.id]: e.target.value }))
                    }
                    placeholder="xxxxxxxx@group.calendar.google.com"
                  />
                ))}
                <Button type="submit" loading={loading}>
                  {t('common.save')}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('calendar.syncCardTitle')} />
          <CardBody>
            <p className={styles.desc}>{t('calendar.syncCardDesc')}</p>
            <Button onClick={handleManualSync} loading={syncing} variant="secondary">
              <RefreshCw size={14} />
              &nbsp;{t('calendar.syncManual')}
            </Button>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
