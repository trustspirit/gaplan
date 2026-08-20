import { useId, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './StatCard.module.scss'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  note?: string
  tone?: 'neutral' | 'warning'
  children?: ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  unit,
  note,
  tone = 'neutral',
  children,
  className,
}: StatCardProps) {
  const labelId = useId()
  return (
    <div className={clsx(styles.card, className)} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        {label}
      </p>
      <p className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </p>
      {children}
      {note && <p className={clsx(styles.note, styles[tone])}>{note}</p>}
    </div>
  )
}
