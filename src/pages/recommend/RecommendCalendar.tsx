import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import {
  isFirstSunday,
  isGeneralConferenceSunday,
  type CalendarEvent,
} from '../../../functions/src/visitSundayAvailability'
import { WardPicker } from './WardPicker'
import styles from './RecommendCalendar.module.scss'

/** 요청 일요일 한 칸의 상태 — RecommendPage가 정해서 넘긴다 */
export type SundayCellState =
  | { kind: 'open'; pickedWard: string | null; others: number }
  | { kind: 'busy'; reason: string }
  | { kind: 'unitBlocked'; reason: string }
  | { kind: 'decided'; label: string; ours: boolean }

interface Props {
  sundays: string[]
  cells: Record<string, SundayCellState>
  /** 이 단위에 관련된 공개 행사(지역 전체 + 이 단위 대상) */
  events: CalendarEvent[]
  /** 이 단위의 와드 — 달력에서 바로 고르게 한다. recencyOf는 "6개월 전" 같은 방문 기록 */
  wards: { id: string; label: string }[]
  recencyOf: (wardId: string) => string
  picks: Record<string, string>
  onPick: (date: string, wardId: string) => void
  /** 마감된 요청은 보기만 */
  readOnly: boolean
}

function eventsOn(events: CalendarEvent[], day: string) {
  return events.filter((e) => e.date <= day && day <= (e.endDate ?? e.date))
}

/**
 * 추천할 일요일을 앞뒤 일정과 함께 보는 달력. 요청 기간의 달을 모두 그린다.
 * 요청 일요일은 상태(추천 가능·고름·칠십인 불가·우리 단위 행사·확정)로 칠하고, 다른 날에는
 * 공개 행사를 얹는다. 날짜를 누르면 아래에 그날 일정이 뜨고, 추천할 수 있는 일요일이면 거기서
 * 바로 와드를 고른다(목록의 선택과 같은 상태를 쓴다).
 */
export function RecommendCalendar({ sundays, cells, events, wards, recencyOf, picks, onPick, readOnly }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)

  const months = useMemo(() => {
    if (sundays.length === 0) return []
    const sorted = [...sundays].sort()
    const out: dayjs.Dayjs[] = []
    let m = dayjs(sorted[0]).startOf('month')
    const last = dayjs(sorted[sorted.length - 1]).startOf('month')
    while (!m.isAfter(last)) {
      out.push(m)
      m = m.add(1, 'month')
    }
    return out
  }, [sundays])

  const dow = Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('dd'))
  const selectedEvents = selected ? eventsOn(events, selected) : []
  const selectedCell = selected ? cells[selected] : undefined

  // 고른 날의 자세한 내용은 그 달 바로 아래에 — 석 달을 내려가 찾지 않게.
  const detail = selected && (
        <div className={styles.detail} aria-live="polite">
          <div className={styles.detailDate}>{dayjs(selected).format(`${t('recommend.dateFormat')} (ddd)`)}</div>
          {selectedCell && (
            <p className={styles.detailStatus}>
              {selectedCell.kind === 'open' &&
                (selectedCell.pickedWard
                  ? t('recommend.detailPicked', { ward: selectedCell.pickedWard })
                  : t('recommend.detailOpen'))}
              {selectedCell.kind === 'busy' && selectedCell.reason}
              {selectedCell.kind === 'unitBlocked' && selectedCell.reason}
              {selectedCell.kind === 'decided' && selectedCell.label}
              {selectedCell.kind === 'open' && selectedCell.others > 0 &&
                ` · ${t('recommend.othersPicked', { count: selectedCell.others })}`}
            </p>
          )}
          {selectedEvents.length === 0 && !selectedCell && (
            <p className={styles.detailStatus}>{t('recommend.detailNone')}</p>
          )}
          {selectedEvents.length > 0 && (
            <ul className={styles.detailEvents}>
              {selectedEvents.map((e) => (
                <li key={e.title + e.date}>
                  <span className={clsx(styles.dot, e.blocking && styles.dotBlocking)} aria-hidden />
                  {e.title}
                  {e.endDate && (
                    <span className={styles.detailRange}>
                      {dayjs(e.date).format('M.D')}–{dayjs(e.endDate).format('M.D')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {selectedCell?.kind === 'open' && !readOnly && (
            <div className={styles.pick}>
              <WardPicker
                legend={t('recommend.pickHere')}
                wards={wards}
                recencyOf={recencyOf}
                value={picks[selected] ?? ''}
                onChange={(wardId) => onPick(selected, wardId)}
              />
            </div>
          )}
        </div>
  )

  return (
    <div className={styles.calendar}>
      <ul className={styles.legend}>
        <li><span className={clsx(styles.swatch, styles.cell_open)} />{t('recommend.legendOpen')}</li>
        <li><span className={clsx(styles.swatch, styles.cell_picked)} />{t('recommend.legendPicked')}</li>
        <li><span className={clsx(styles.swatch, styles.cell_busy)} />{t('recommend.legendBusy')}</li>
        <li><span className={clsx(styles.swatch, styles.cell_unitBlocked)} />{t('recommend.legendUnitBlocked')}</li>
        <li><span className={clsx(styles.swatch, styles.cell_decided)} />{t('recommend.legendDecided')}</li>
        <li><span className={clsx(styles.swatch, styles.swatchEvent)} />{t('recommend.legendEvent')}</li>
      </ul>
      {months.map((month) => {
        const start = month.startOf('week')
        const end = month.endOf('month').endOf('week')
        const days: dayjs.Dayjs[] = []
        for (let d = start; !d.isAfter(end, 'day'); d = d.add(1, 'day')) days.push(d)
        return (
          <section key={month.format('YYYY-MM')} className={styles.month}>
            <h3 className={styles.monthTitle}>{month.format(t('recommend.monthFormat'))}</h3>
            <div className={styles.grid} role="grid">
              {dow.map((d, i) => (
                <div key={d} className={clsx(styles.dow, i === 0 && styles.dowSun)} role="columnheader">
                  {d}
                </div>
              ))}
              {days.map((d) => {
                const key = d.format('YYYY-MM-DD')
                const inMonth = d.month() === month.month()
                const cell = inMonth ? cells[key] : undefined
                const dayEvents = inMonth ? eventsOn(events, key) : []
                const special =
                  inMonth && d.day() === 0
                    ? isGeneralConferenceSunday(key)
                      ? t('recommend.generalConferenceSunday')
                      : isFirstSunday(key)
                        ? t('recommend.fastSunday')
                        : null
                    : null
                if (!inMonth) return <div key={key} className={styles.blank} aria-hidden />
                return (
                  <button
                    key={key}
                    type="button"
                    className={clsx(
                      styles.day,
                      d.day() === 0 && styles.sunday,
                      cell && styles[`cell_${cell.kind}`],
                      cell?.kind === 'open' && cell.pickedWard && styles.cell_picked,
                      selected === key && styles.selected,
                    )}
                    aria-label={[d.format(t('recommend.dateFormat')), special, ...dayEvents.map((e) => e.title)]
                      .filter(Boolean)
                      .join(', ')}
                    aria-pressed={selected === key}
                    onClick={() => setSelected(selected === key ? null : key)}
                  >
                    <span className={styles.num}>{d.date()}</span>
                    {cell?.kind === 'open' && !cell.pickedWard && (
                      <Check size={12} aria-hidden className={styles.okMark} />
                    )}
                    {cell?.kind === 'open' && cell.pickedWard && (
                      <span className={styles.cellText}>{cell.pickedWard}</span>
                    )}
                    {cell?.kind === 'decided' && <span className={styles.cellText}>{cell.label}</span>}
                    {special && !cell && <span className={styles.special}>{special}</span>}
                    {dayEvents.length > 0 && (
                      <span className={styles.events}>
                        {dayEvents.slice(0, 2).map((e) => (
                          <span
                            key={e.title + e.date}
                            className={clsx(styles.event, e.blocking && styles.eventBlocking)}
                          >
                            {e.title}
                          </span>
                        ))}
                        {dayEvents.length > 2 && <span className={styles.more}>+{dayEvents.length - 2}</span>}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {selected?.startsWith(month.format('YYYY-MM')) && detail}
          </section>
        )
      })}


    </div>
  )
}
