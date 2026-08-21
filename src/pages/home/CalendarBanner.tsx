import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { subscribeToSharedCalendar } from '@/services/calendarService'
import { Button } from '@/components/ui'
import styles from './HomePage.module.scss'

export function CalendarBanner({ connected }: { connected?: boolean }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await subscribeToSharedCalendar()
      toast.success(t('schedule.calendarSuccess'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('schedule.calendarSubscribeFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.calendarBanner}>
      <Calendar size={16} color="var(--color-primary, #177C9C)" />
      <span className={styles.calendarBannerText}>{t('schedule.calendarBannerText')}</span>
      {connected ? (
        <div className={styles.calendarConnected}>
          <CheckCircle2 size={14} />
          {t('schedule.calendarConnected')}
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleConnect} loading={loading}>
          {t('schedule.calendarSubscribe')}
        </Button>
      )}
    </div>
  )
}
