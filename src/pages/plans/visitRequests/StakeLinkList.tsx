import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Copy, ExternalLink } from 'lucide-react'
import { setUnitSundays } from '@/services/visitRequestService'
import { recommendUrl } from '@/utils/visitRequest'
import { unitSundayOptions, type UnitSundayOption } from '@/utils/unitSundays'
import { REGIONS, getRegionColor } from '@/constants/regions'
import { unavailableReasons } from './sundayReasons'
import { Button } from '@/components/ui'
import type { VisitRecommendation, VisitRequest } from '@/types'
import type { SundayStatus } from '../../../../functions/src/visitSundayAvailability'
import styles from './StakeLinkList.module.scss'

interface Props {
  request: VisitRequest
  recommendations: VisitRecommendation[]
  sundayStatus: Record<string, SundayStatus>
  onCopy: (text: string) => void
}

/**
 * 스테이크마다 따로 보내는 추천 링크. 링크 하나는 그 스테이크만 연다 — 다른 스테이크의 추천은
 * 보이지 않고, 다른 곳으로 확정된 날은 "확정됨"으로만 보인다.
 * 보내기 전에 그 스테이크에 물어볼 일요일을 고른다(방문 가능한 일요일 중 그 스테이크가 가능한 날).
 */
export function StakeLinkList({ request, recommendations, sundayStatus, onCopy }: Props) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState<string | null>(null)
  const responded = new Map(recommendations.map((r) => [r.unitId, r]))
  const multiRegion = new Set(request.units.map((u) => u.regionId)).size > 1
  const regionName = (id: string | undefined) => REGIONS.find((r) => r.id === id)?.name ?? id ?? ''
  const unitName = (id: string) => request.units.find((u) => u.id === id)?.ko ?? id

  /** 고를 수 없는 이유를 자세히 — 로그인한 칠십인·집행서기만 보는 화면이라 일정 제목까지 적는다 */
  const blockDetail = (o: UnitSundayOption, unitId: string): string => {
    const st = sundayStatus[o.date]
    switch (o.block) {
      case 'otherRegion':
        return t('visitRequest.otherRegionTurn', { region: regionName(request.sundayRegions?.[o.date]) })
      case 'busy':
        return unavailableReasons(o.date, st, t).join(' / ')
      case 'unitBlocked': {
        const title = st?.unitBlocks[unitId]
        return title ? `${t('visitRequest.unitSundayBlock.unitBlocked')} · ${title}` : t('visitRequest.unitSundayBlock.unitBlocked')
      }
      case 'decidedOther': {
        const d = request.decisions[o.date]
        return t('visitRequest.decidedElsewhere', { unit: unitName(d.unitId), ward: d.wardName })
      }
      default:
        return ''
    }
  }

  const toggle = async (unitId: string, date: string, selectedNow: string[]) => {
    const next = selectedNow.includes(date) ? selectedNow.filter((d) => d !== date) : [...selectedNow, date]
    setSaving(unitId)
    try {
      await setUnitSundays(request.id, unitId, next)
    } catch {
      toast.error(t('visitRequest.unitSundaysFailed'))
    } finally {
      setSaving(null)
    }
  }

  const hasRoles = Object.keys(request.unitSundayRoles ?? {}).length > 0
  return (
    <>
      {hasRoles && <p className={styles.legend}>{t('visitRequest.roleLegend')}</p>}
      <ul className={styles.list}>
        {request.units.map((u) => {
          const token = request.unitTokens?.[u.id]
          const options = unitSundayOptions(request, u.id, sundayStatus)
          const selected = options.filter((o) => o.selected).map((o) => o.date)
          const available = options.filter((o) => o.block === null).length
          const months = [...new Set(options.map((o) => o.date.slice(0, 7)))]
          // 칩 아래에 적는 것: 고를 수 없는 이유(다른 CC 차례는 칩에 이미 적혀 있어 뺀다)와,
          // 고를 수 있는 날의 이 스테이크 관련 참고 행사
          const details = options.flatMap((o) => {
            if (o.block === 'otherRegion') return []
            if (o.block) return [{ date: o.date, text: blockDetail(o, u.id), note: false }]
            return (sundayStatus[o.date]?.notes ?? [])
              .filter((n) => !n.unitIds || n.unitIds.includes(u.id))
              .map((n) => ({ date: o.date, text: t('visitRequest.unitNote', { title: n.title }), note: true }))
          })
          const rec = responded.get(u.id)
          const url = token ? recommendUrl(request.id, token) : ''
          const message = t('visitRequest.shareMessage', {
            title: request.title,
            unit: u.ko,
            seventy: request.seventyName,
            dates: selected.map((d) => dayjs(d).format('M/D')).join(', '),
            due: request.dueDate
              ? t('visitRequest.shareDue', { date: dayjs(request.dueDate).format(t('recommend.dateFormat')) })
              : '',
            guidance: request.guidance ? t('visitRequest.shareGuidance', { text: request.guidance }) : '',
            url,
          })
          return (
            <li key={u.id} className={styles.row}>
              <div className={styles.head}>
                <span className={styles.unit}>{u.ko}</span>
                {multiRegion && u.regionId && (
                  <span
                    className={styles.region}
                    style={{
                      background: getRegionColor(u.regionId).bg,
                      color: getRegionColor(u.regionId).text,
                      borderColor: getRegionColor(u.regionId).border,
                    }}
                  >
                    {regionName(u.regionId)}
                  </span>
                )}
                <span className={styles.wards}>{t('visitRequest.unitWardCount', { count: u.wards.length })}</span>
                <span className={clsx(styles.status, rec && styles.statusDone)}>
                  {rec ? t('visitRequest.unitResponded', { name: rec.submitterName }) : t('visitRequest.unitPending')}
                </span>
              </div>
              <fieldset className={styles.dates} disabled={saving === u.id}>
                <legend className={styles.datesLegend}>
                  {t('visitRequest.unitSundays', { count: selected.length, total: options.length })}
                </legend>
                {available === 0 && <p className={styles.none}>{t('visitRequest.unitSundaysNone')}</p>}
                {months.map((month) => (
                  <div key={month} className={styles.monthRow}>
                    <span className={styles.month}>{dayjs(`${month}-01`).format(t('visitRequest.monthFormat'))}</span>
                    <div className={styles.chips}>
                      {options.filter((o) => o.date.startsWith(month)).map((o) => {
                        const roles = request.unitSundayRoles?.[o.date]
                        const role = roles?.primary === u.id ? 'primary' : roles?.backup === u.id ? 'backup' : undefined
                        return (
                          <button
                            key={o.date}
                            type="button"
                            aria-pressed={o.selected}
                            aria-label={[
                              dayjs(o.date).format(t('visitRequest.reasonDateFormat')),
                              role ? t(`visitRequest.role.${role}`) : '',
                            ].filter(Boolean).join(' · ')}
                            data-role={role}
                            disabled={o.block !== null}
                            title={o.block ? blockDetail(o, u.id) : undefined}
                            className={clsx(
                              styles.chip,
                              o.selected && styles.chipOn,
                              o.block && styles.chipBlocked,
                              o.block === 'otherRegion' && styles.chipOtherRegion,
                            )}
                            onClick={() => toggle(u.id, o.date, selected)}
                          >
                            {role && <span className={clsx(styles.roleDot, role === 'backup' && styles.roleDotBackup)} aria-hidden />}
                            <span className={styles.chipDay}>{dayjs(o.date).format('D')}</span>
                            {o.block && (
                              <span className={styles.chipReason}>{t(`visitRequest.unitSundayBlock.${o.block}`)}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </fieldset>
              {details.length > 0 && (
                <ul className={styles.details}>
                  {details.map((d) => (
                    <li key={d.date + d.text} className={clsx(d.note && styles.detailNote)}>
                      <span className={styles.detailDate}>{dayjs(d.date).format(t('visitRequest.reasonDateFormat'))}</span>
                      <span>{d.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {token ? (
                <div className={styles.actions}>
                  <Button size="sm" disabled={selected.length === 0} onClick={() => onCopy(url)}>
                    <Copy size={14} aria-hidden /> {t('visitRequest.copyLink')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={selected.length === 0}
                    onClick={() => onCopy(message)}
                  >
                    {t('visitRequest.copyMessage')}
                  </Button>
                  <a className={styles.open} href={url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} aria-hidden /> {t('visitRequest.open')}
                  </a>
                </div>
              ) : (
                <p className={styles.none}>{t('visitRequest.linkPreparing')}</p>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
