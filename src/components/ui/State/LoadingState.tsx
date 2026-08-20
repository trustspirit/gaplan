import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/Skeleton/Skeleton'
import styles from './LoadingState.module.scss'

type Shape = 'list' | 'card' | 'stat'

const ROW_HEIGHT: Record<Shape, string> = {
  list: '44px',
  card: '96px',
  stat: '72px',
}

interface LoadingStateProps {
  shape?: Shape
  rows?: number
  label?: string
  className?: string
}

export function LoadingState({ shape = 'list', rows = 3, label, className }: LoadingStateProps) {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(styles.wrap, styles[shape], className)}
      data-shape={shape}
      role="status"
      aria-busy="true"
      aria-label={label ?? t('common.loading')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={ROW_HEIGHT[shape]} className={styles.row} data-skeleton-row="" />
      ))}
    </div>
  )
}
