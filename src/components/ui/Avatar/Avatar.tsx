import clsx from 'clsx'
import styles from './Avatar.module.scss'
type AvatarSize = 'sm' | 'md' | 'lg'
interface AvatarProps { name: string; size?: AvatarSize; className?: string }
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return <div className={clsx(styles.avatar, styles[size], className)}>{name.slice(0, 1)}</div>
}
