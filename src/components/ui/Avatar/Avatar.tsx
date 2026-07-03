import clsx from 'clsx'
import styles from './Avatar.module.scss'
type AvatarSize = 'sm' | 'md' | 'lg'
interface AvatarProps { name: string; size?: AvatarSize; className?: string }
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  // Array.from is grapheme-safer than slice for surrogate-pair characters
  const initial = Array.from(name.trim())[0] ?? '?'
  return (
    <div
      className={clsx(styles.avatar, styles[size], className)}
      role="img"
      aria-label={name || undefined}
      title={name || undefined}
    >
      {initial}
    </div>
  )
}
