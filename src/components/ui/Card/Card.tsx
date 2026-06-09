import clsx from 'clsx'
import styles from './Card.module.scss'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={clsx(styles.card, className)} {...props}>
      {children}
    </div>
  )
}
export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>{title}</span>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={clsx(styles.body, className)}>{children}</div>
}
