import type { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './DataList.module.scss'

export interface DataListRow {
  id: string
  lead?: { primary: string; secondary?: string }
  title: string
  subtitle?: string
  meta?: string
  tag?: string
  tagTone?: 'neutral' | 'accent'
  // Small state indicators (verified / accompanied / done, ...) — not
  // actions. Rendered next to the tag. `actions` means "things you can do";
  // these are just facts about the row, so they don't belong there.
  badges?: ReactNode
  actions?: ReactNode
  onClick?: () => void
  highlighted?: boolean
  dimmed?: boolean
}

interface DataListProps {
  rows: DataListRow[]
  'aria-label': string
  footer?: ReactNode
  className?: string
}

function RowBody({ row }: { row: DataListRow }) {
  return (
    <>
      {row.lead && (
        <div className={styles.lead}>
          <b className={styles.leadPrimary}>{row.lead.primary}</b>
          {row.lead.secondary && <span className={styles.leadSecondary}>{row.lead.secondary}</span>}
        </div>
      )}
      <div className={styles.main}>
        <b className={styles.title}>{row.title}</b>
        {row.subtitle && <span className={styles.subtitle}>{row.subtitle}</span>}
      </div>
      {row.meta && <span className={styles.meta}>{row.meta}</span>}
      {row.tag && (
        <span className={clsx(styles.tag, row.tagTone === 'accent' && styles.tagAccent)}>
          {row.tag}
        </span>
      )}
      {row.badges && <div className={styles.badges}>{row.badges}</div>}
    </>
  )
}

export function DataList({ rows, 'aria-label': ariaLabel, footer, className }: DataListProps) {
  return (
    <div className={clsx(styles.wrap, className)}>
      <ul className={styles.list} aria-label={ariaLabel}>
        {rows.map((row) => (
          <li
            key={row.id}
            className={clsx(
              styles.row,
              row.highlighted && styles.highlighted,
              row.dimmed && styles.dimmed,
            )}
          >
            {row.onClick ? (
              <button type="button" className={styles.rowButton} onClick={row.onClick}>
                <RowBody row={row} />
              </button>
            ) : (
              <div className={styles.rowStatic}>
                <RowBody row={row} />
              </div>
            )}
            {row.actions && <div className={styles.actions}>{row.actions}</div>}
          </li>
        ))}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}
