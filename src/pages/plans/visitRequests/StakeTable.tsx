import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { REGIONS, getRegionColor } from '@/constants/regions'
import { wardRecency } from '@/utils/visitRequest'
import type { MatrixCell, MatrixRow, PlanMatrix } from './stakeSundayMatrix'
import styles from './StakeTable.module.scss'

export interface StakeTableColumn {
  key: string
  header: string
  render: (row: MatrixRow) => ReactNode
  className?: string
}

interface Props {
  matrix: PlanMatrix
  today: string
  /** 방문 기록을 받기 전이면 마지막 방문을 적지 않는다(전부 "기록 없음"으로 보이지 않게) */
  showLastVisit?: boolean
  /** 주면 칸을 눌러 그 스테이크에 그 일요일을 묻기/빼기 */
  onToggle?: (unitId: string, date: string) => void
  /** 저장 중인 스테이크 — 그 행의 칸을 잠근다 */
  savingUnit?: string | null
  /** 칸 설명에 덧붙일 자세한 이유(행사 제목, 어디로 확정됐는지 등) */
  cellDetail?: (unitId: string, date: string, cell: MatrixCell) => string | undefined
  /** 횟수 뒤에 붙는 칸(응답, 링크 등) */
  columns?: StakeTableColumn[]
}

const SELECTABLE = new Set<MatrixCell['kind']>(['primary', 'backup', 'asked', 'none'])

function Mark({ kind }: { kind: MatrixCell['kind'] }) {
  if (kind === 'decided') return <Check size={16} strokeWidth={3} className={styles.check} aria-hidden />
  if (kind === 'primary' || kind === 'backup' || kind === 'asked') {
    return <span className={clsx(styles.mark, styles[`mark_${kind}`])} aria-hidden />
  }
  return null
}

/**
 * 스테이크 × 일요일 배정 표. 누가 언제·몇 번 묻는지, 몰림과 빈 곳을 한눈에 보고, 칸을 눌러 바로 고친다.
 * 스테이크 칸의 마지막 방문은 추천 순서(방문 없음 → 오래된 순)가 왜 그런지 보여 준다.
 */
export function StakeTable({ matrix, today, showLastVisit = true, onToggle, savingUnit, cellDetail, columns = [] }: Props) {
  const { t } = useTranslation()
  const { sundays, rows, regionOf } = matrix
  const multiRegion = new Set(rows.map((r) => r.unit.regionId)).size > 1
  const months = [...new Set(sundays.map((d) => d.slice(0, 7)))]
  const regionName = (id: string | undefined) => REGIONS.find((r) => r.id === id)?.name ?? id ?? ''
  const monthStart = (i: number) => i > 0 && sundays[i].slice(0, 7) !== sundays[i - 1].slice(0, 7)
  const dateText = (d: string) => dayjs(d).format(t('visitRequest.reasonDateFormat'))

  const lastVisitText = (row: MatrixRow) => {
    const r = wardRecency({ lastVisit: row.lastVisit }, today)
    const last =
      r.tone === 'never'
        ? t('visitRequest.matrix.lastNever')
        : r.tone === 'fresh'
          ? t('visitRequest.matrix.lastFresh')
          : t('visitRequest.matrix.lastMonths', { months: Math.max(1, r.monthsSince ?? 0) })
    return row.nextVisit
      ? `${last} · ${t('visitRequest.matrix.scheduled', { date: dayjs(row.nextVisit).format('M/D') })}`
      : last
  }
  const cellLabel = (row: MatrixRow, date: string, cell: MatrixCell) => {
    const base =
      cell.kind === 'blocked' ? t(`visitRequest.unitSundayBlock.${cell.block}`) : t(`visitRequest.matrix.cell.${cell.kind}`)
    const detail = cellDetail?.(row.unit.id, date, cell)
    return [dateText(date), base, detail].filter(Boolean).join(' · ')
  }
  const span = sundays.length + 2 + columns.length

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>{t('visitRequest.matrix.caption')}</caption>
          <thead>
            <tr>
              <th rowSpan={2} scope="col" className={clsx(styles.stakeCol, styles.headLabel)}>
                {t('visitRequest.matrix.stake')}
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  scope="colgroup"
                  colSpan={sundays.filter((d) => d.startsWith(m)).length}
                  className={clsx(styles.monthHead, m !== months[0] && styles.monthStart)}
                >
                  {dayjs(`${m}-01`).format(t('visitRequest.monthFormat'))}
                </th>
              ))}
              <th rowSpan={2} scope="col" className={clsx(styles.countCol, styles.headLabel)}>
                {t('visitRequest.matrix.count')}
              </th>
              {columns.map((c) => (
                <th key={c.key} rowSpan={2} scope="col" className={clsx(styles.headLabel, styles.extraHead, c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
            <tr>
              {sundays.map((d, i) => {
                const region = multiRegion ? regionOf[d] : undefined
                const color = region ? getRegionColor(region) : null
                return (
                  <th key={d} scope="col" className={clsx(styles.dayHead, monthStart(i) && styles.monthStart)}>
                    <span
                      className={styles.day}
                      style={color ? { background: color.bg, color: color.text, borderColor: color.border } : undefined}
                      title={region ? regionName(region) : undefined}
                    >
                      {dayjs(d).format('D')}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const regionStarts = multiRegion && (ri === 0 || rows[ri - 1].unit.regionId !== row.unit.regionId)
              const extra = row.total - row.primary - row.backup
              const locked = savingUnit === row.unit.id
              return (
                <Fragment key={row.unit.id}>
                  {regionStarts && (
                    <tr className={styles.regionRow}>
                      <th colSpan={span} scope="colgroup">
                        <span
                          className={styles.regionTag}
                          style={{
                            background: getRegionColor(row.unit.regionId ?? '').bg,
                            color: getRegionColor(row.unit.regionId ?? '').text,
                            borderColor: getRegionColor(row.unit.regionId ?? '').border,
                          }}
                        >
                          {regionName(row.unit.regionId)}
                        </span>
                      </th>
                    </tr>
                  )}
                  <tr className={styles.row}>
                    <th scope="row" className={clsx(styles.stakeCol, styles.stake)}>
                      <span className={styles.stakeName}>{row.unit.ko}</span>
                      {showLastVisit && (
                        <span className={styles.stakeMeta} title={lastVisitText(row)}>
                          {lastVisitText(row)}
                        </span>
                      )}
                    </th>
                    {sundays.map((d, i) => {
                      const cell = row.cells[d]
                      const label = cellLabel(row, d, cell)
                      const role = cell.kind === 'primary' || cell.kind === 'backup' ? cell.kind : undefined
                      const offTurn = cell.kind === 'blocked' && cell.block === 'otherRegion'
                      const className = clsx(
                        styles.cell,
                        monthStart(i) && styles.monthStart,
                        cell.kind === 'blocked' && (offTurn ? styles.offTurn : styles.blocked),
                      )
                      if (onToggle && SELECTABLE.has(cell.kind)) {
                        return (
                          <td key={d} className={className}>
                            <button
                              type="button"
                              className={styles.toggle}
                              aria-pressed={cell.kind !== 'none'}
                              aria-label={`${row.unit.ko} ${label}`}
                              title={label}
                              data-role={role}
                              disabled={locked}
                              onClick={() => onToggle(row.unit.id, d)}
                            >
                              <Mark kind={cell.kind} />
                            </button>
                          </td>
                        )
                      }
                      return (
                        <td key={d} className={className} title={label} data-role={role}>
                          <Mark kind={cell.kind} />
                          <span className={styles.srOnly}>{label}</span>
                        </td>
                      )
                    })}
                    <td
                      className={clsx(styles.countCol, styles.count, row.total === 0 && styles.countZero)}
                      title={t('visitRequest.matrix.countTitle', { primary: row.primary, backup: row.backup, extra })}
                    >
                      {row.primary} / {row.backup}
                      {extra > 0 && <span className={styles.extra}> +{extra}</span>}
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className={clsx(styles.extraCell, c.className)}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <ul className={styles.legend} aria-label={t('visitRequest.matrix.legendLabel')}>
        <li><Mark kind="primary" />{t('visitRequest.matrix.cell.primary')}</li>
        <li><Mark kind="backup" />{t('visitRequest.matrix.cell.backup')}</li>
        <li><Mark kind="asked" />{t('visitRequest.matrix.cell.asked')}</li>
        <li><Mark kind="decided" />{t('visitRequest.matrix.cell.decided')}</li>
        <li><span className={clsx(styles.swatch, styles.blocked)} aria-hidden />{t('visitRequest.matrix.legendBlocked')}</li>
        {multiRegion && (
          <li><span className={clsx(styles.swatch, styles.offTurn)} aria-hidden />{t('visitRequest.unitSundayBlock.otherRegion')}</li>
        )}
        {onToggle && <li className={styles.legendHint}>{t('visitRequest.matrix.editHint')}</li>}
      </ul>
    </div>
  )
}
