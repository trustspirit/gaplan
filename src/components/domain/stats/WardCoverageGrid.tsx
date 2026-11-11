import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { CalendarClock } from 'lucide-react'
import type { UnitCoverage, WardCoverage } from '@/utils/visitInsights'
import styles from './WardCoverageGrid.module.scss'

interface Props {
  units: UnitCoverage[]
  onSelect?: (ward: WardCoverage) => void
}

/** 방문 횟수의 단계. 색은 한 색의 옅음→진함이고, 칸마다 횟수를 숫자로도 적는다. */
function levelOf(visits: number): 'lv0' | 'lv1' | 'lv2' {
  return visits === 0 ? 'lv0' : visits === 1 ? 'lv1' : 'lv2'
}

/**
 * 스테이크·와드별 방문 분포. 스테이크마다 한 줄, 그 안에 와드를 칸으로 늘어놓는다 — 어느
 * 스테이크가 비어 있고 어느 와드에 몰렸는지를 한눈에 본다. 막대그래프로는 "빠진 와드"가 보이지 않는다.
 */
export function WardCoverageGrid({ units, onSelect }: Props) {
  const { t } = useTranslation()

  if (units.length === 0) return <p className={styles.empty}>{t('stats.noData')}</p>

  return (
    <div className={styles.grid}>
      <ul className={styles.legend} aria-label={t('stats.legendLabel')}>
        <li><span className={clsx(styles.swatch, styles.lv0)} />{t('stats.legend0')}</li>
        <li><span className={clsx(styles.swatch, styles.lv1)} />{t('stats.legend1')}</li>
        <li><span className={clsx(styles.swatch, styles.lv2)} />{t('stats.legend2')}</li>
        <li><CalendarClock size={12} className={styles.plannedIcon} />{t('stats.legendPlanned')}</li>
      </ul>

      {units.map((u, i) => {
        // CC가 바뀌는 자리에 CC 이름을 한 번 적는다.
        const showRegion = units[i - 1]?.regionId !== u.regionId
        return (
          <section key={u.id}>
            {showRegion && <h4 className={styles.region}>{u.regionName}</h4>}
            <div className={styles.unitHead}>
              <span className={styles.unitName}>{u.name}</span>
              <span className={styles.unitCount}>
                {t('stats.coverageFraction', { visited: u.wardsVisited, total: u.wardsTotal })}
              </span>
            </div>
            <ul className={styles.cells}>
              {u.wards.map((w) => {
                const planned = w.nextVisitDate ? dayjs(w.nextVisitDate).format('M.D') : null
                const label = [
                  w.name,
                  t('stats.cellVisits', { count: w.visits }),
                  planned ? t('stats.planned', { date: planned }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      className={clsx(styles.cell, styles[levelOf(w.visits)])}
                      onClick={() => onSelect?.(w)}
                      title={label}
                      aria-label={label}
                    >
                      <span className={styles.cellName}>{w.name}</span>
                      <span className={styles.cellMeta}>
                        {planned && <CalendarClock size={11} aria-hidden="true" />}
                        <span className={styles.cellCount}>{w.visits}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
