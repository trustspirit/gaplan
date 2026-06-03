import clsx from 'clsx'
import styles from './Skeleton.module.scss'
interface SkeletonProps { width?: string; height?: string; className?: string }
export function Skeleton({ width, height, className }: SkeletonProps) {
  return <div className={clsx(styles.skeleton, className)} style={{ width, height }} />
}
