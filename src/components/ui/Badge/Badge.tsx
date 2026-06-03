import clsx from 'clsx'
import styles from './Badge.module.scss'
type Variant = 'default' | 'warning' | 'success' | 'danger'
interface BadgeProps { variant?: Variant; children: React.ReactNode; className?: string }
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[variant], className)}>{children}</span>
}
