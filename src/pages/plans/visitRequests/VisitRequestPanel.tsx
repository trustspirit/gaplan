import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { useVisitRequests } from '@/hooks/useVisitRequests'
import { createVisitRequest } from '@/services/visitRequestService'
import { ROLE } from '@/constants/roles'
import { planVisitRequestDetailPath } from '@/router/routes'
import { isFastSunday } from '@/utils/fastSunday'
import { upcomingSundays, unitsSnapshotForRegions } from '@/utils/visitRequest'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import type { AppUser } from '@/types'
import styles from './VisitRequestPanel.module.scss'

const SUNDAY_PAGE = 16

function regionIdsOf(u: AppUser | undefined): string[] {
  if (!u) return []
  if (u.regionIds?.length) return u.regionIds
  return u.regionId ? [u.regionId] : []
}

export function VisitRequestPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const { requests, loading, error } = useVisitRequests(user)

  const seventies = useMemo(() => users.filter((u) => u.role === ROLE.SEVENTY), [users])
  // 칠십인은 자기 자신, 집행서기는 담당 칠십인으로 고정된다. 관리자만 고른다.
  const fixedSeventyUid =
    user.role === ROLE.SEVENTY
      ? user.uid
      : user.role === ROLE.EXEC_SECRETARY
        ? (user.assignedSeventyUid ?? '')
        : null

  const [title, setTitle] = useState('')
  const [pickedSeventy, setPickedSeventy] = useState('')
  const [sundayCount, setSundayCount] = useState(SUNDAY_PAGE)
  const [sundays, setSundays] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)

  const seventyUid = fixedSeventyUid ?? pickedSeventy
  const seventy =
    seventyUid === user.uid ? user : seventies.find((s) => s.uid === seventyUid)
  const regionIds = regionIdsOf(seventy)
  const offered = useMemo(() => upcomingSundays(sundayCount), [sundayCount])

  const toggleSunday = (date: string) =>
    setSundays((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]))

  const canCreate =
    !!title.trim() && !!seventyUid && !!seventy && regionIds.length > 0 && sundays.length > 0

  const handleCreate = async () => {
    if (!canCreate || !seventy) return
    setCreating(true)
    try {
      const id = await createVisitRequest(
        {
          title: title.trim(),
          note: note.trim(),
          seventyUid,
          seventyName: seventy.name,
          sundays,
          dueDate: dueDate || null,
          units: unitsSnapshotForRegions(regionIds),
        },
        user.uid,
      )
      navigate(planVisitRequestDetailPath(id))
    } catch {
      toast.error(t('visitRequest.createFailed'))
      setCreating(false)
    }
  }


  return (
    <div className={styles.panel}>
      <Card>
        <CardHeader title={t('visitRequest.newTitle')} />
        <CardBody>
          <p className={styles.hint}>{t('visitRequest.newHint')}</p>
          <div className={styles.form}>
            <Input
              label={t('visitRequest.title')}
              value={title}
              placeholder={t('visitRequest.titlePlaceholder')}
              onChange={(e) => setTitle(e.target.value)}
            />
            {fixedSeventyUid === null && (
              <Select
                label={t('visitRequest.seventy')}
                value={pickedSeventy}
                onChange={(e) => setPickedSeventy(e.target.value)}
                options={seventies.map((s) => ({ value: s.uid, label: s.name }))}
              />
            )}
            {fixedSeventyUid === '' && (
              <p className={styles.warn} role="alert">
                {t('visitRequest.noSeventy')}
              </p>
            )}
            {seventy && regionIds.length === 0 && (
              <p className={styles.warn} role="alert">
                {t('visitRequest.noRegion')}
              </p>
            )}

            <fieldset className={styles.sundayField}>
              <legend className={styles.legend}>
                {t('visitRequest.sundays')}
                <span className={styles.count}>
                  {t('visitRequest.sundaysHint', { count: sundays.length })}
                </span>
              </legend>
              <div className={styles.sundayGrid}>
                {offered.map((date, i) => {
                  const d = dayjs(date)
                  // 월이 바뀌는 자리에 월 이름을 끼워 넣어 칩 묶음을 읽기 쉽게 한다.
                  const showMonth = i === 0 || offered[i - 1].slice(0, 7) !== date.slice(0, 7)
                  const on = sundays.includes(date)
                  return (
                    <span key={date} className={styles.sundayCell}>
                      {showMonth && <span className={styles.month}>{d.format(t('visitRequest.monthFormat'))}</span>}
                      <button
                        type="button"
                        aria-pressed={on}
                        className={clsx(styles.sundayChip, on && styles.sundayChipOn)}
                        onClick={() => toggleSunday(date)}
                      >
                        <span className={styles.chipDay}>{d.format('D')}</span>
                        {isFastSunday(d) && <span className={styles.chipFast}>{t('visitRequest.fastShort')}</span>}
                      </button>
                    </span>
                  )
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSundayCount((c) => c + SUNDAY_PAGE)}
              >
                {t('visitRequest.moreSundays')}
              </Button>
            </fieldset>

            <Input
              type="date"
              label={t('visitRequest.dueDate')}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <Textarea
              label={t('visitRequest.note')}
              value={note}
              rows={3}
              placeholder={t('visitRequest.notePlaceholder')}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button onClick={handleCreate} loading={creating} disabled={!canCreate}>
              {t('visitRequest.create')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('visitRequest.listTitle')} />
        <CardBody>
          {loading && <LoadingState shape="list" rows={3} />}
          {!loading && error && <ErrorState title={t('visitRequest.loadFailed')} />}
          {!loading && !error && requests.length === 0 && (
            <EmptyState title={t('visitRequest.empty')} />
          )}
          {!loading &&
            !error &&
            requests.map((r) => {
              const decided = r.sundays.filter((d) => r.decisions?.[d]).length
              return (
                <button
                  key={r.id}
                  type="button"
                  className={styles.row}
                  onClick={() => navigate(planVisitRequestDetailPath(r.id))}
                >
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{r.title}</span>
                    <span className={styles.rowMeta}>
                      {r.seventyName} ·{' '}
                      {t('visitRequest.progress', {
                        responded: r.respondedUnitIds?.length ?? 0,
                        units: r.units.length,
                        decided,
                        sundays: r.sundays.length,
                      })}
                    </span>
                  </span>
                  <Badge variant={r.status === 'open' ? 'success' : 'default'}>
                    {r.status === 'open'
                      ? t('visitRequest.statusOpen')
                      : t('visitRequest.statusClosed')}
                  </Badge>
                </button>
              )
            })}
        </CardBody>
      </Card>
    </div>
  )
}
