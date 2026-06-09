import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Copy, Check, Globe } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { manualCalendarSync } from '@/services/scheduleService'
import { db } from '@/firebase'
import { REGIONS, getUnitsByRegion } from '@/constants/regions'
import { generatePublicToken } from '@/utils/publicToken'
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
  const [schedulePublic, setSchedulePublic] = useState(false)
  const [globalToken, setGlobalToken] = useState<string>('')
  const [savingPublic, setSavingPublic] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unitTokenData, setUnitTokenData] = useState<Record<string, { enabled: boolean; token: string }>>({})
  const [unitCopied, setUnitCopied] = useState<string | null>(null)
  const [togglingScope, setTogglingScope] = useState<string | null>(null)

  const publicUrl = globalToken ? `${window.location.origin}/public/schedule/${globalToken}` : ''

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'settings', 'calendar')),
      getDoc(doc(db, 'settings', 'public')),
      getDoc(doc(db, 'settings', 'publicUnits')),
    ]).then(([calSnap, pubSnap, unitsSnap]) => {
      const calData = calSnap.data()
      if (calData?.calendars) setCalendarIds(calData.calendars as Record<string, string>)
      const pubData = pubSnap.data()
      setSchedulePublic(pubData?.schedulePublic === true)
      if (pubData?.globalToken) setGlobalToken(pubData.globalToken as string)
      if (unitsSnap.exists()) setUnitTokenData(unitsSnap.data() as Record<string, { enabled: boolean; token: string }>)
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

  const handleTogglePublic = async () => {
    const next = !schedulePublic
    setSavingPublic(true)
    try {
      if (next && !globalToken) {
        const token = generatePublicToken()
        const batch = writeBatch(db)
        batch.set(doc(db, 'settings', 'public'), { schedulePublic: true, globalToken: token }, { merge: true })
        batch.set(doc(db, 'settings', 'publicTokens'), { [token]: '__all__' }, { merge: true })
        await batch.commit()
        setGlobalToken(token)
      } else {
        await setDoc(doc(db, 'settings', 'public'), { schedulePublic: next }, { merge: true })
      }
      setSchedulePublic(next)
      toast.success(next ? t('admin.schedulePublicEnabled') : t('admin.schedulePublicDisabled'))
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setSavingPublic(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error(t('common.saveFailed'))
    })
  }

  const handleToggleUnit = async (scopeId: string) => {
    const current = unitTokenData[scopeId]
    const next = !current?.enabled
    setTogglingScope(scopeId)
    try {
      let token = current?.token
      const batch = writeBatch(db)

      if (next && !token) {
        // First enable: generate a new token
        token = generatePublicToken()
        batch.set(doc(db, 'settings', 'publicUnits'), { [scopeId]: { enabled: true, token } }, { merge: true })
        batch.set(doc(db, 'settings', 'publicTokens'), { [token]: scopeId }, { merge: true })
      } else if (next && token) {
        // Re-enable: always upsert publicTokens to handle missing entry
        batch.set(doc(db, 'settings', 'publicUnits'), { [scopeId]: { enabled: true, token } }, { merge: true })
        batch.set(doc(db, 'settings', 'publicTokens'), { [token]: scopeId }, { merge: true })
      } else {
        // Disable: keep token for future re-enable, just flip enabled
        batch.set(doc(db, 'settings', 'publicUnits'), { [scopeId]: { enabled: false, token: token ?? '' } }, { merge: true })
      }

      await batch.commit()
      setUnitTokenData(prev => ({ ...prev, [scopeId]: { enabled: next, token: token ?? '' } }))
      toast.success(next ? t('admin.schedulePublicEnabled') : t('admin.schedulePublicDisabled'))
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setTogglingScope(null)
    }
  }

  const handleCopyUnitLink = (scopeId: string, token: string) => {
    const url = `${window.location.origin}/public/schedule/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setUnitCopied(scopeId)
      setTimeout(() => setUnitCopied(null), 2000)
    }).catch(() => toast.error(t('common.saveFailed')))
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

        <Card>
          <CardHeader title={t('admin.publicScheduleTitle')} />
          <CardBody>
            <p className={styles.desc}>{t('admin.publicScheduleDesc')}</p>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={schedulePublic}
                  onChange={handleTogglePublic}
                  disabled={savingPublic || fetching}
                />
                <span className={styles.toggleTrack}>
                  <span className={styles.toggleThumb} />
                </span>
                <span className={styles.toggleText}>
                  {schedulePublic ? t('admin.schedulePublicOn') : t('admin.schedulePublicOff')}
                </span>
              </label>
            </div>
            {schedulePublic && globalToken && (
              <div className={styles.publicLinkRow}>
                <Globe size={14} className={styles.publicLinkIcon} />
                <span className={styles.publicLinkUrl}>{publicUrl}</span>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={handleCopyLink}
                  title={t('common.copyLink')}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('admin.perUnitPublicTitle')} />
          <CardBody>
            <p className={styles.desc}>{t('admin.perUnitPublicDesc')}</p>
            <div className={styles.unitList}>
              {REGIONS.map(region => (
                <div key={region.id} className={styles.unitGroup}>
                  <div className={styles.unitRow}>
                    <span className={styles.unitName}>{region.name}</span>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        className={styles.toggleInput}
                        checked={unitTokenData[region.id]?.enabled ?? false}
                        onChange={() => handleToggleUnit(region.id)}
                        disabled={togglingScope === region.id || fetching}
                      />
                      <span className={styles.toggleTrack}><span className={styles.toggleThumb} /></span>
                    </label>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => {
                        const tok = unitTokenData[region.id]?.token
                        if (tok) handleCopyUnitLink(region.id, tok)
                      }}
                      disabled={!unitTokenData[region.id]?.enabled || !unitTokenData[region.id]?.token}
                      title={t('common.copyLink')}
                    >
                      {unitCopied === region.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  {getUnitsByRegion(region.id).map(unit => (
                    <div key={unit.id} className={`${styles.unitRow} ${styles.unitRowIndented}`}>
                      <span className={styles.unitName}>{unit.name}</span>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          className={styles.toggleInput}
                          checked={unitTokenData[unit.id]?.enabled ?? false}
                          onChange={() => handleToggleUnit(unit.id)}
                          disabled={togglingScope === unit.id || fetching}
                        />
                        <span className={styles.toggleTrack}><span className={styles.toggleThumb} /></span>
                      </label>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => {
                          const tok = unitTokenData[unit.id]?.token
                          if (tok) handleCopyUnitLink(unit.id, tok)
                        }}
                        disabled={!unitTokenData[unit.id]?.enabled || !unitTokenData[unit.id]?.token}
                        title={t('common.copyLink')}
                      >
                        {unitCopied === unit.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
