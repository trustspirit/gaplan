import { useState, useEffect } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { manualCalendarSync } from '@/services/scheduleService'
import { db } from '@/firebase'
import { REGIONS } from '@/constants/regions'
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui'

/**
 * 지역별 구글 캘린더 ID 입력과 수동 동기화를 한 카드에 묶는다.
 * 판정 R50 — 동기화는 설정이 아니라 액션이다. 대상(지역 ID) 옆에 둔다.
 */
export function CalendarLinkCard() {
  const { t } = useTranslation()
  const [calendarIds, setCalendarIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null)

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
      setSyncResult({ synced: result.synced })
      toast.success(result.message)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('common.syncError'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader title={t('settings.system.calendarTitle')} />
      <CardBody>
        <p>{t('settings.system.calendarDesc')}</p>
        {fetching ? (
          <p>{t('common.loading')}</p>
        ) : (
          <form onSubmit={handleSave}>
            {REGIONS.map((region) => (
              <Input
                key={region.id}
                label={region.name}
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
        <p>{t('settings.system.syncDesc')}</p>
        <Button onClick={handleManualSync} loading={syncing} variant="secondary">
          {t('settings.system.syncTitle')}
        </Button>
        {syncResult && (
          <p data-testid="sync-result">
            {t('settings.system.syncResult', { synced: syncResult.synced })}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
