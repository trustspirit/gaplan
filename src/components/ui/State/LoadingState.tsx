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
  /** 보이는 텍스트가 아니라 접근성 이름이다 — 스켈레톤은 화면에 글자를 그리지 않는다 */
  'aria-label'?: string
  className?: string
}

export function LoadingState({
  shape = 'list',
  rows = 3,
  'aria-label': ariaLabel,
  className,
}: LoadingStateProps) {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(styles.wrap, styles[shape], className)}
      data-shape={shape}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel ?? t('common.loading')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={ROW_HEIGHT[shape]} className={styles.row} data-skeleton-row="" />
      ))}
    </div>
  )
}
