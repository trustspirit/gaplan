import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { inviteUser } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { REGIONS } from '@/constants/regions'
import { ROLE_LABELS } from '@/constants/roles'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Select, Button, Badge, Avatar, Skeleton } from '@/components/ui'
import type { UserRole } from '@/types'
import styles from './UserManagement.module.scss'

const ROLE_OPTIONS = (['admin','seventy','president'] as UserRole[]).map(r => ({ value: r, label: ROLE_LABELS[r] }))
const REGION_OPTIONS = REGIONS.map(r => ({ value: r.id, label: r.name }))

export function UserManagement() {
  const user = useAtomValue(authUserAtom)!
  const { users, loading: usersLoading } = useUsers()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('president')
  const [regionId, setRegionId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await inviteUser(email.trim(), role, role === 'seventy' ? regionId : undefined, user.uid)
      toast.success(`${email}을 초대했습니다.`)
      setEmail('')
      setRegionId('')
    } catch {
      toast.error('초대에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="사용자 관리" />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="사용자 초대" />
          <CardBody>
            <form className={styles.form} onSubmit={handleInvite}>
              <Input label="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" required />
              <Select label="역할" value={role} onChange={e => setRole(e.target.value as UserRole)} options={ROLE_OPTIONS} />
              {role === 'seventy' && (
                <Select label="담당 지역" value={regionId} onChange={e => setRegionId(e.target.value)} options={REGION_OPTIONS} />
              )}
              <Button type="submit" loading={loading}>초대 발송</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="전체 사용자" />
          <CardBody>
            {usersLoading
              ? [1,2,3].map(i => <Skeleton key={i} height="44px" className={styles.skeletonRow} />)
              : users.map(u => (
                <div key={u.uid} className={styles.userRow}>
                  <Avatar name={u.name} size="sm" />
                  <div className={styles.userInfo}>
                    <p className={styles.userName}>{u.name}</p>
                    <p className={styles.userEmail}>{u.email}</p>
                  </div>
                  <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'seventy' ? 'warning' : 'default'}>
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </div>
              ))}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
