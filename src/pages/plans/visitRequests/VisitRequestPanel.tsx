import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { useVisitRequests } from '@/hooks/useVisitRequests'
import { createVisitRequest, fetchSundayStatus } from '@/services/visitRequestService'
import { ROLE } from '@/constants/roles'
import { planVisitRequestDetailPath } from '@/router/routes'
import {
  isFirstSunday,
  isGeneralConferenceSunday,
  type BusyKind,
  type SundayStatus,
} from '../../../../functions/src/visitSundayAvailability'
import {
  consecutiveSameRegion,
  regionForNewSunday,
  rotateRegions,
} from '../../../../functions/src/visitRegionRotation'
import { REGIONS, getRegionColor } from '@/constants/regions'
import {
  GUIDANCE_PRESET_KEYS,
  quarterKey,
  quarterOf,
  quarterSundays,
  unitsSnapshotForRegions,
  upcomingQuarters,
  type Quarter,
} from '@/utils/visitRequest'
import { GuidanceField } from './GuidanceField'
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

const QUARTER_CHOICES = 4

/** 일요일이 막힌 이유들. 금식·연차 대회 주일은 서버 응답이 없어도(받기 전·빠진 날) 안다. */
function busyKindsOf(date: string, status: Record<string, SundayStatus>): BusyKind[] {
  const fromServer = status[date]?.busy.map((b) => b.kind)
  if (fromServer) return fromServer
  if (isGeneralConferenceSunday(date)) return ['generalConference']
  if (isFirstSunday(date)) return ['fast']
  return []
}

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

  // 방문 계획은 보통 분기 단위 — 분기를 고르면 그 분기의 일요일이 펼쳐진다.
  // 이번 분기가 이미 진행 중이면 다음 분기를 먼저 고른다(보통 미리 계획한다).
  const quarters = useMemo(() => upcomingQuarters(QUARTER_CHOICES), [])
  const [quarter, setQuarter] = useState<Quarter>(() =>
    quarterKey(quarters[0]) === quarterKey(quarterOf(dayjs())) && quarters[1] ? quarters[1] : quarters[0],
  )
  const quarterLabel = (qt: Quarter) => t('visitRequest.quarterLabel', { year: qt.year, q: qt.q })
  const [title, setTitle] = useState('')
  // 제목을 손대지 않았으면 고른 분기로 채운다.
  const [titleTouched, setTitleTouched] = useState(false)
  const [pickedSeventy, setPickedSeventy] = useState('')
  const [sundays, setSundays] = useState<string[]>([])
  // CC를 둘 이상 맡았으면 일요일마다 차례인 CC — 한 CC를 연달아 방문하지 않도록.
  const [sundayRegions, setSundayRegions] = useState<Record<string, string>>({})
  // 첫 일요일 전 마지막 와드 방문의 CC
  const [lastRegion, setLastRegion] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  // 기본으로 가장 흔한 강조(오래 방문받지 못한 와드)를 넣어 둔다 — 지우면 강조 없이 보낸다.
  const [guidance, setGuidance] = useState(() => t(GUIDANCE_PRESET_KEYS[0]))
  const [creating, setCreating] = useState(false)

  const seventyUid = fixedSeventyUid ?? pickedSeventy
  const seventy =
    seventyUid === user.uid ? user : seventies.find((s) => s.uid === seventyUid)
  const regionIds = regionIdsOf(seventy)
  const regionKey = regionIds.join(',')
  const offered = useMemo(() => quarterSundays(quarter), [quarter])
  const titleValue = titleTouched ? title : t('visitRequest.quarterTitle', { year: quarter.year, q: quarter.q })

  // 칠십인 기준으로 비어 있는 일요일만 고를 수 있게, 일요일마다 일정·참석 행사·막은 날을 받아 온다.
  const [status, setStatus] = useState<Record<string, SundayStatus>>({})
  const [statusState, setStatusState] = useState<'idle' | 'loading' | 'error'>('idle')
  useEffect(() => {
    if (!seventyUid) {
      setStatus({})
      setStatusState('idle')
      return
    }
    let cancelled = false
    setStatusState('loading')
    setSundays([])
    setSundayRegions({})
    const rotation = regionKey.split(',').filter(Boolean)
    fetchSundayStatus(seventyUid, offered)
      .then(({ status: st, lastVisitRegion }) => {
        if (cancelled) return
        setStatus(st)
        setLastRegion(lastVisitRegion)
        setStatusState('idle')
        // 분기의 빈 일요일을 모두 골라 둔다 — 보통은 그대로 두고 몇 개만 뺀다.
        // 분기·칠십인을 바꾸면 그 기준으로 다시 고른다.
        const free = offered.filter((d) => busyKindsOf(d, st).length === 0)
        setSundays(free)
        // 바로 앞 방문의 CC로는 시작하지 않는다 — 분기 경계에서도 번갈아 가게.
        setSundayRegions(rotation.length > 1 ? rotateRegions(free, rotation, lastVisitRegion) : {})
      })
      .catch(() => !cancelled && setStatusState('error'))
    return () => {
      cancelled = true
    }
  }, [seventyUid, offered, regionKey])

  const busyKinds = (date: string) => busyKindsOf(date, status)
  const snapshotUnits = useMemo(() => unitsSnapshotForRegions(regionIds), [regionIds])

  const multiRegion = regionIds.length > 1
  const regionName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id
  const regionShort = (id: string) => regionName(id).replace(/\s*CC$/, '')

  const toggleSunday = (date: string) => {
    if (sundays.includes(date)) {
      setSundays(sundays.filter((d) => d !== date))
      const rest = { ...sundayRegions }
      delete rest[date]
      setSundayRegions(rest)
      return
    }
    setSundays([...sundays, date])
    if (multiRegion) {
      setSundayRegions({ ...sundayRegions, [date]: regionForNewSunday(date, sundayRegions, regionIds) })
    }
  }
  const cycleRegion = (date: string) => {
    const i = regionIds.indexOf(sundayRegions[date])
    setSundayRegions({ ...sundayRegions, [date]: regionIds[(i + 1) % regionIds.length] })
  }
  const selectAllFree = () => {
    const free = offered.filter((d) => busyKinds(d).length === 0)
    setSundays(free)
    setSundayRegions(multiRegion ? rotateRegions(free, regionIds, lastRegion) : {})
  }
  const reRotate = () => setSundayRegions(rotateRegions(sundays, regionIds, lastRegion))
  const clearSundays = () => {
    setSundays([])
    setSundayRegions({})
  }
  // 같은 CC가 연달아 붙은 일요일 — 칠십인이 CC를 바꾸다 생길 수 있다.
  const repeated = new Set(multiRegion ? consecutiveSameRegion(sundayRegions) : [])

  const canCreate =
    !!titleValue.trim() && !!seventyUid && !!seventy && regionIds.length > 0 && sundays.length > 0

  const handleCreate = async () => {
    if (!canCreate || !seventy) return
    setCreating(true)
    try {
      const id = await createVisitRequest(
        {
          title: titleValue.trim(),
          note: note.trim(),
          guidance: guidance.trim(),
          seventyUid,
          seventyName: seventy.name,
          sundays,
          ...(multiRegion
            ? {
                sundayRegions: Object.fromEntries(sundays.map((d) => [d, sundayRegions[d]])),
                regions: regionIds.map((id) => ({ id, name: regionName(id) })),
              }
            : {}),
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
              value={titleValue}
              placeholder={t('visitRequest.titlePlaceholder')}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleTouched(true)
              }}
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
              <div className={styles.quarters} role="radiogroup" aria-label={t('visitRequest.quarter')}>
                {quarters.map((qt) => {
                  const on = quarterKey(qt) === quarterKey(quarter)
                  return (
                    <button
                      key={quarterKey(qt)}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={clsx(styles.quarterBtn, on && styles.quarterBtnOn)}
                      onClick={() => setQuarter(qt)}
                    >
                      {quarterLabel(qt)}
                    </button>
                  )
                })}
              </div>
              <div className={styles.monthRows}>
                {[...new Set(offered.map((d) => d.slice(0, 7)))].map((month) => (
                  <div key={month} className={styles.monthRow}>
                    <span className={styles.month}>{dayjs(`${month}-01`).format(t('visitRequest.monthFormat'))}</span>
                    <div className={styles.sundayGrid}>
                      {offered.filter((d) => d.startsWith(month)).map((date) => {
                  const d = dayjs(date)
                  const on = sundays.includes(date)
                  const kinds = busyKinds(date)
                  const st = status[date]
                  const reasons = [
                    ...(st?.busy ?? []).map((b) =>
                      [t(`visitRequest.busyKind.${b.kind}`), b.label].filter(Boolean).join(' '),
                    ),
                    ...(st && Object.keys(st.unitBlocks).length > 0
                      ? [
                          t('visitRequest.boardUnitBlocks', {
                            units: Object.keys(st.unitBlocks)
                              .map((id) => snapshotUnits.find((u) => u.id === id)?.ko ?? id)
                              .join(', '),
                          }),
                        ]
                      : []),
                  ]
                  const region = on && multiRegion ? sundayRegions[date] : undefined
                  const regionColor = region ? getRegionColor(region) : null
                  return (
                    <span key={date} className={clsx(styles.sundayCell, multiRegion && styles.sundayCellStack)}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={kinds.length > 0}
                        title={reasons.join(' / ') || undefined}
                        className={clsx(
                          styles.sundayChip,
                          on && styles.sundayChipOn,
                          kinds.length > 0 && styles.sundayChipBusy,
                          st && Object.keys(st.unitBlocks).length > 0 && styles.sundayChipPartial,
                        )}
                        onClick={() => toggleSunday(date)}
                      >
                        <span className={styles.chipDay}>{d.format('D')}</span>
                        {kinds.length > 0 && (
                          <span className={styles.chipFast}>{t(`visitRequest.busyKind.${kinds[0]}`)}</span>
                        )}
                      </button>
                      {region && regionColor && (
                        <button
                          type="button"
                          className={clsx(styles.regionTag, repeated.has(date) && styles.regionTagRepeat)}
                          style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                          aria-label={t('visitRequest.regionSwitch', { date: d.format('M/D'), region: regionName(region) })}
                          onClick={() => cycleRegion(date)}
                        >
                          {regionShort(region)}
                        </button>
                      )}
                      {multiRegion && !region && <span className={styles.regionTagSpace} aria-hidden />}
                    </span>
                  )
                })}
                    </div>
                  </div>
                ))}
              </div>
              <p className={styles.sundayHint}>
                {statusState === 'loading'
                  ? t('visitRequest.sundayLoading')
                  : statusState === 'error'
                    ? t('visitRequest.sundayLoadFailed')
                    : t('visitRequest.sundaysFreeHint')}
              </p>
              {multiRegion && sundays.length > 0 && (
                <div className={styles.regionSummary}>
                  <p className={styles.sundayHint}>
                    {t('visitRequest.regionHint')}{' '}
                    {lastRegion && `${t('visitRequest.regionLast', { region: regionName(lastRegion) })} `}
                    {regionIds
                      .map((id) => `${regionShort(id)} ${sundays.filter((d) => sundayRegions[d] === id).length}`)
                      .join(' · ')}
                  </p>
                  {repeated.size > 0 && (
                    <p className={styles.warn} role="alert">
                      {t('visitRequest.regionRepeat', {
                        dates: [...repeated].map((d) => dayjs(d).format('M/D')).join(', '),
                      })}
                    </p>
                  )}
                </div>
              )}
              <div className={styles.sundayActions}>
                <Button variant="secondary" size="sm" disabled={!seventyUid} onClick={selectAllFree}>
                  {t('visitRequest.selectAllFree')}
                </Button>
                {multiRegion && sundays.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={reRotate}>
                    {t('visitRequest.regionRotate')}
                  </Button>
                )}
                {sundays.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSundays}>
                    {t('visitRequest.clearSundays')}
                  </Button>
                )}
              </div>
            </fieldset>

            <Input
              type="date"
              label={t('visitRequest.dueDate')}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <GuidanceField value={guidance} onChange={setGuidance} />
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
