import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { inviteUser, updateUserRole, deleteUserAccount } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { REGIONS } from '@/constants/regions'
import { ROLE_LABELS } from '@/constants/roles'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Select, Button, Badge, Avatar, Skeleton, Modal } from '@/components/ui'
import type { AppUser, UserRole } from '@/types'
import styles from './UserManagement.module.scss'

const ROLE_OPTIONS = (['admin', 'seventy', 'president'] as UserRole[]).map(r => ({ value: r, label: ROLE_LABELS[r] }))
const REGION_OPTIONS = REGIONS.map(r => ({ value: r.id, label: r.name }))

function EditRoleModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState<UserRole>(user.role)
  const [regionId, setRegionId] = useState(user.regionId ?? '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateUserRole(user.uid, role, role === 'seventy' ? regionId : undefined)
      toast.success(`${user.name}의 역할이 변경되었습니다.`)
      onSaved()
      onClose()
    } catch {
      toast.error('역할 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`역할 변경 — ${user.name}`}>
      <form className={styles.editForm} onSubmit={handleSave}>
        <Select
          label="역할"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          options={ROLE_OPTIONS}
        />
        {role === 'seventy' && (
          <Select
            label="담당 지역"
            value={regionId}
            onChange={e => setRegionId(e.target.value)}
            options={REGION_OPTIONS}
          />
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>취소</Button>
          <Button type="submit" loading={loading}>저장</Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteConfirmModal({
  user,
  onClose,
  onDeleted,
}: {
  user: AppUser
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteUserAccount(user.uid)
      toast.success(`${user.name} 계정이 삭제되었습니다.`)
      onDeleted()
      onClose()
    } catch {
      toast.error('삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="사용자 삭제">
      <p className={styles.deleteDesc}>
        <strong>{user.name}</strong> ({user.email}) 계정을 삭제하시겠습니까?<br />
        이 작업은 되돌릴 수 없습니다.
      </p>
      <div className={styles.modalActions}>
        <Button variant="ghost" type="button" onClick={onClose}>취소</Button>
        <Button variant="danger" loading={loading} onClick={handleDelete}>삭제</Button>
      </div>
    </Modal>
  )
}

export function UserManagement() {
  const currentUser = useAtomValue(authUserAtom)!
  const { users, loading: usersLoading } = useUsers()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('president')
  const [regionId, setRegionId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviteLoading(true)
    try {
      await inviteUser(email.trim(), role, role === 'seventy' ? regionId : undefined, currentUser.uid)
      toast.success(`${email}을 초대했습니다.`)
      setEmail('')
      setRegionId('')
    } catch {
      toast.error('초대에 실패했습니다.')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <AppShell role={currentUser.role} name={currentUser.name} topBar={<TopBar name={currentUser.name} subtext="사용자 관리" />}>
      <div className={styles.page}>
        <div className={styles.inviteCol}>
          <Card>
            <CardHeader title="사용자 초대" />
            <CardBody>
              <form className={styles.form} onSubmit={handleInvite}>
                <Input label="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" required />
                <Select label="역할" value={role} onChange={e => setRole(e.target.value as UserRole)} options={ROLE_OPTIONS} />
                {role === 'seventy' && (
                  <Select label="담당 지역" value={regionId} onChange={e => setRegionId(e.target.value)} options={REGION_OPTIONS} />
                )}
                <Button type="submit" loading={inviteLoading}>초대 발송</Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className={styles.listCol}>
          <Card>
            <CardHeader title="전체 사용자" />
            <CardBody>
              {usersLoading
                ? [1, 2, 3].map(i => <Skeleton key={i} height="44px" className={styles.skeletonRow} />)
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
                      <div className={styles.userActions}>
                        <button
                          className={styles.iconBtn}
                          title="역할 변경"
                          type="button"
                          onClick={() => setEditingUser(u)}
                        >
                          <Pencil size={14} />
                        </button>
                        {u.uid !== currentUser.uid && (
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="삭제"
                            type="button"
                            onClick={() => setDeletingUser(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              }
            </CardBody>
          </Card>
        </div>
      </div>

      {editingUser && (
        <EditRoleModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => setEditingUser(null)}
        />
      )}
      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => setDeletingUser(null)}
        />
      )}
    </AppShell>
  )
}
