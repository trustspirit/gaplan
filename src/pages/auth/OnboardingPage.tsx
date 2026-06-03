import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { useSetAtom } from 'jotai'
import { auth, db } from '@/firebase'
import { authUserAtom } from '@/store/authAtom'
import { ALL_UNITS } from '@/constants/regions'
import { Input, Select, Button } from '@/components/ui'
import styles from './OnboardingPage.module.scss'

export function OnboardingPage() {
  const [name, setName] = useState('')
  const [unitId, setUnitId] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useSetAtom(authUserAtom)
  const navigate = useNavigate()

  const unitOptions = ALL_UNITS.map(u => ({ value: u.id, label: u.name }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !unitId) {
      toast.error('이름과 소속을 입력해주세요.')
      return
    }
    const firebaseUser = auth.currentUser
    if (!firebaseUser) {
      toast.error('로그인이 필요합니다.')
      navigate('/login')
      return
    }
    setLoading(true)
    try {
      const newUser = {
        email: firebaseUser.email ?? '',
        name: name.trim(),
        role: 'president' as const,
        unitId,
        createdAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
      setUser({ uid: firebaseUser.uid, ...newUser, createdAt: new Date().toISOString() })
      toast.success('환영합니다!')
      navigate('/dashboard')
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>처음 오셨군요!</h1>
        <p className={styles.subtitle}>소속과 이름을 입력해주세요.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input label="이름" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" required />
          <Select label="소속 스테이크/지방부" value={unitId} onChange={e => setUnitId(e.target.value)} options={unitOptions} required />
          <Button type="submit" loading={loading} fullWidth size="lg">시작하기</Button>
        </form>
      </div>
    </div>
  )
}
