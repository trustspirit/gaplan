import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { CalendarClock, Check, Minus } from 'lucide-react'
import type { InterviewQuarter, QuarterContact, UnitInterviewStatus } from '@/utils/visitInsights'
import styles from './InterviewStatusTable.module.scss'

const ICONS: Record<QuarterContact, typeof Check> = {
  done: Check,
  scheduled: CalendarClock,
  none: Minus,
}

/**
 * 스테이크 회장 접견 현황. 스테이크마다 최근 분기의 접견 여부를 표로 보여준다 — 이번 분기에
 * 아직 안 한 곳이 위로 온다(정렬은 computeVisitInsights). 상태는 색만으로 구분하지 않고
 * 아이콘과 글자를 함께 쓴다.
 */
export function InterviewStatusTable({ rows }: { rows: UnitInterviewStatus[] }) {
  const { t } = useTranslation()

  if (rows.length === 0) return <p className={styles.empty}>{t('stats.noData')}</p>

  const quarterLabel = (q: InterviewQuarter) => {
    const [year, quarter] = q.key.split('-Q')
    return q.isCurrent
      ? t('stats.thisQuarter')
      : t('stats.quarterLabel', { year: year.slice(2), q: quarter })
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">{t('stats.interviewUnit')}</th>
            {rows[0].quarters.map((q) => (
              <th key={q.key} scope="col" className={clsx(styles.quarterHead, q.isCurrent && styles.current)}>
                {quarterLabel(q)}
              </th>
            ))}
            <th scope="col" className={styles.lastHead}>{t('stats.interviewLast')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.unitId}>
              <th scope="row" className={styles.unit}>
                <span className={styles.unitName}>{row.unitName}</span>
                <span className={styles.region}>{row.regionName}</span>
              </th>
              {row.quarters.map((q) => {
                const Icon = ICONS[q.contact]
                return (
                  <td key={q.key} className={clsx(styles.cell, q.isCurrent && styles.current)}>
                    <span className={clsx(styles.status, styles[q.contact])}>
                      <Icon size={13} aria-hidden="true" />
                      <span>{t(`stats.interview.${q.contact}`)}</span>
                    </span>
                  </td>
                )
              })}
              <td className={styles.last}>
                {row.lastContactDate ? dayjs(row.lastContactDate).format('YYYY.M.D') : t('stats.interviewNever')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
