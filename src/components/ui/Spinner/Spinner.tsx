import clsx from 'clsx'
import styles from './Spinner.module.scss'
export function Spinner({ className }: { className?: string }) {
  return <div className={clsx(styles.spinner, className)} role="status" aria-label="로딩 중" />
}
