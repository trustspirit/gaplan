import { Clock } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { signOut } from '@/services/authService'
import { Button } from '@/components/ui'
import styles from './PendingPage.module.scss'

export function PendingPage() {
  const user = useAtomValue(authUserAtom)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      toast.error('로그아웃에 실패했습니다.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Clock size={32} />
        </div>
        <h1 className={styles.title}>승인 대기 중</h1>
        <p className={styles.desc}>
          {user?.name ? `${user.name}님, ` : ''}관리자가 계정을 승인하면 서비스를 이용하실 수 있습니다.
          <br />
          승인 후 다시 로그인해주세요.
        </p>
        <p className={styles.email}>{user?.email}</p>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          로그아웃
        </Button>
      </div>
    </div>
  )
}
