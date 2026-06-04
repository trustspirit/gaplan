import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { signInWithGoogle } from '@/services/authService'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import styles from './LoginPage.module.scss'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const user = useAtomValue(authUserAtom)
  const authLoading = useAtomValue(authLoadingAtom)
  const navigate = useNavigate()

  if (!authLoading && user) {
    navigate(user.role === 'president' && !user.unitId ? '/onboarding' : '/dashboard', { replace: true })
    return null
  }

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      toast.error('로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo} />
        <h1 className={styles.title}>gaplan</h1>
        <p className={styles.subtitle}>지역 칠십인 일정 관리</p>
        <Button onClick={handleSignIn} loading={loading} fullWidth size="lg">
          Google 계정으로 로그인
        </Button>
      </div>
    </div>
  )
}
