import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { REGIONS, getRegionColor } from '@/constants/regions'
import { wardRecency } from '@/utils/visitRequest'
import type { MatrixCell, PlanMatrix as PlanMatrixData } from './stakeSundayMatrix'
import styles from './PlanMatrix.module.scss'

const GLYPH: Record<MatrixCell['kind'], string> = {
  primary: '●',
  backup: '○',
  asked: '•',
  decided: '✓',
  blocked: '',
  none: '',
}

/**
 * 스테이크 × 일요일 배정 표 — 누가 언제·몇 번 묻는지, 몰림과 빈 곳을 한눈에.
 * 스테이크 칸에 마지막 방문을 같이 적어 추천 순서(방문 없음 → 오래된 순)가 왜 그런지 보이게 한다.
 */
export function PlanMatrix({ matrix, today }: { matrix: PlanMatrixData; today: string }) {
  const { t } = useTranslation()
  const { sundays, rows, regionOf } = matrix
  const multiRegion = new Set(rows.map((r) => r.unit.regionId)).size > 1
  const months = [...new Set(sundays.map((d) => d.slice(0, 7)))]
  const regionName = (id: string | undefined) => REGIONS.find((r) => r.id === id)?.name ?? id ?? ''

  const lastVisitText = (lastVisit: string | null) => {
    const r = wardRecency({ lastVisit }, today)
    if (r.tone === 'never') return t('visitRequest.matrix.lastNever')
    if (r.tone === 'fresh') return t('visitRequest.matrix.lastFresh')
    return t('visitRequest.matrix.lastMonths', { months: Math.max(1, r.monthsSince ?? 0) })
  }
  const cellLabel = (cell: MatrixCell) =>
    cell.kind === 'blocked' ? t(`visitRequest.unitSundayBlock.${cell.block}`) : t(`visitRequest.matrix.cell.${cell.kind}`)

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{t('visitRequest.matrix.caption')}</caption>
          <thead>
            <tr>
              <th rowSpan={2} scope="col" className={styles.stakeHead}>
                {t('visitRequest.matrix.stake')}
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  scope="colgroup"
                  colSpan={sundays.filter((d) => d.startsWith(m)).length}
                  className={styles.monthHead}
                >
                  {dayjs(`${m}-01`).format(t('visitRequest.monthFormat'))}
                </th>
              ))}
              <th rowSpan={2} scope="col" className={styles.countHead}>
                {t('visitRequest.matrix.count')}
              </th>
            </tr>
            <tr>
              {sundays.map((d, i) => {
                const region = multiRegion ? regionOf[d] : undefined
                const color = region ? getRegionColor(region) : null
                return (
                  <th
                    key={d}
                    scope="col"
                    className={clsx(styles.dayHead, i > 0 && d.slice(0, 7) !== sundays[i - 1].slice(0, 7) && styles.monthStart)}
                    style={color ? { background: color.bg, color: color.text } : undefined}
                    title={region ? regionName(region) : undefined}
                  >
                    {dayjs(d).format('D')}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const regionStarts = multiRegion && (ri === 0 || rows[ri - 1].unit.regionId !== row.unit.regionId)
              const extra = row.total - row.primary - row.backup
              const meta = [
                lastVisitText(row.lastVisit),
                row.nextVisit ? t('visitRequest.matrix.scheduled', { date: dayjs(row.nextVisit).format('M/D') }) : '',
              ].filter(Boolean).join(' · ')
              return (
                <Fragment key={row.unit.id}>
                  {regionStarts && (
                    <tr>
                      <th colSpan={sundays.length + 2} scope="colgroup" className={styles.regionRow}>
                        {regionName(row.unit.regionId)}
                      </th>
                    </tr>
                  )}
                  <tr>
                    <th scope="row" className={styles.stake}>
                      <span className={styles.stakeName}>{row.unit.ko}</span>
                      <span className={styles.stakeMeta} title={meta}>
                        {meta}
                      </span>
                    </th>
                    {sundays.map((d, i) => {
                      const cell = row.cells[d]
                      return (
                        <td
                          key={d}
                          className={clsx(
                            styles.cell,
                            styles[cell.kind],
                            i > 0 && d.slice(0, 7) !== sundays[i - 1].slice(0, 7) && styles.monthStart,
                          )}
                          title={`${dayjs(d).format(t('visitRequest.reasonDateFormat'))} · ${cellLabel(cell)}`}
                        >
                          <span aria-hidden>{GLYPH[cell.kind]}</span>
                          <span className={styles.srOnly}>
                            {dayjs(d).format(t('visitRequest.reasonDateFormat'))} {cellLabel(cell)}
                          </span>
                        </td>
                      )
                    })}
                    <td
                      className={styles.count}
                      title={t('visitRequest.matrix.countTitle', { primary: row.primary, backup: row.backup, extra })}
                    >
                      {row.primary} / {row.backup}
                      {extra > 0 && <span className={styles.extra}> +{extra}</span>}
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.legend}>{t('visitRequest.matrix.legend')}</p>
    </div>
  )
}
