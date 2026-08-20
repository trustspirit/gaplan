import clsx from 'clsx'
import styles from './Skeleton.module.scss'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string
  height?: string
}
export function Skeleton({ width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(styles.skeleton, className)}
      style={{ width, height, ...style }}
      {...props}
    />
  )
}
