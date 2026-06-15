import { Fragment, useRef, type PointerEvent } from 'react'
import dayjs from 'dayjs'
import { Input } from '@/components/ui'
import styles from './TimePainterPicker.module.scss'

interface Props {
  selectedDates: string[]           // YYYY-MM-DD[]
  dailyRange: [string, string]      // ['09:00', '21:00']
  periodMinutes: number             // 30 or 60
  paintedCells: Set<string>
  onSetCell: (key: string, on: boolean) => void
  onChangeRange: (range: [string, string]) => void
}

function buildAxis(start: string, end: string, step: number): string[] {
  const result: string[] = []
  const [sh, sm] = start.split(':').map(Number)
  let cur = sh * 60 + sm
  const [eh, em] = end.split(':').map(Number)
  const endMin = eh * 60 + em === 0 ? 1440 : eh * 60 + em
  while (cur < endMin) {
    const h = Math.floor(cur / 60) % 24
    const m = cur % 60
    result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    cur += step
  }
  return result
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function TimePainterPicker({
  selectedDates,
  dailyRange,
  periodMinutes,
  paintedCells,
  onSetCell,
  onChangeRange,
}: Props) {
  const axis = buildAxis(dailyRange[0], dailyRange[1], periodMinutes)
  const painting = useRef<{ targetState: boolean; visited: Set<string> } | null>(null)

  const applyToCell = (key: string) => {
    const p = painting.current
    if (!p || p.visited.has(key)) return
    p.visited.add(key)
    onSetCell(key, p.targetState)
  }

  const handlePointerDown = (key: string, currentlyOn: boolean) => {
    painting.current = { targetState: !currentlyOn, visited: new Set([key]) }
    onSetCell(key, !currentlyOn)
  }

  const handleRootPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!painting.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const cell = el?.closest<HTMLElement>('[data-paint-key]')
    if (cell?.dataset.paintKey) applyToCell(cell.dataset.paintKey)
  }

  const handlePointerUp = () => { painting.current = null }

  if (selectedDates.length === 0) {
    return <div className={styles.emptyHint}>날짜를 먼저 선택하세요</div>
  }

  const colCount = selectedDates.length
  const gridStyle = {
    gridTemplateColumns: `40px repeat(${colCount}, minmax(50px, 1fr))`,
    minWidth: `${40 + colCount * 50}px`,
  }

  return (
    <div className={styles.container}>
      <div className={styles.rangeRow}>
        <span className={styles.rangeLabel}>가능한 시간 선택</span>
        <div className={styles.rangeInputs}>
          <Input
            type="time"
            className={styles.timeInput}
            wrapperClassName={styles.timeField}
            aria-label="시작 시간"
            value={dailyRange[0]}
            onChange={(e) => {
              const v = e.target.value
              onChangeRange([v, toMin(dailyRange[1]) > toMin(v) ? dailyRange[1] : v])
            }}
          />
          <span className={styles.separator}>–</span>
          <Input
            type="time"
            className={styles.timeInput}
            wrapperClassName={styles.timeField}
            aria-label="종료 시간"
            value={dailyRange[1]}
            onChange={(e) => {
              const v = e.target.value
              const endMin = v === '00:00' ? 1440 : toMin(v)
              if (endMin > toMin(dailyRange[0])) onChangeRange([dailyRange[0], v])
            }}
          />
        </div>
      </div>

      <div className={styles.scrollWrapper}>
        <div
          className={styles.grid}
          style={gridStyle}
          onPointerMove={handleRootPointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className={styles.timeLabel} />
          {selectedDates.map((ymd) => (
            <div key={ymd} className={styles.headerCell}>
              <span className={styles.dayOfWeek}>
                {dayjs(ymd).format('ddd')}
              </span>
              <span className={styles.dateLabel}>
                {dayjs(ymd).format('M/D')}
              </span>
            </div>
          ))}

          {axis.map((hhmm) => (
            <Fragment key={hhmm}>
              <div className={styles.timeLabel}>{hhmm}</div>
              {selectedDates.map((ymd) => {
                const key = `${ymd}_${hhmm}`
                const on = paintedCells.has(key)
                return (
                  <div
                    key={key}
                    role="gridcell"
                    data-paint-key={key}
                    aria-label={`${ymd} ${hhmm}`}
                    aria-selected={on}
                    className={`${styles.cell}${on ? ` ${styles.painted}` : ''}`}
                    onPointerDown={() => handlePointerDown(key, on)}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
