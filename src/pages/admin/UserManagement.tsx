import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { inviteUser, updateUserRole, updateUserName, deleteUserAccount, addPreRegisteredUser, deletePreRegisteredUser } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { REGIONS, ALL_UNITS } from '@/constants/regions'
import { ROLE_LABELS } from '@/constants/roles'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Select, Button, Badge, Avatar, Skeleton, Modal } from '@/components/ui'
import type { AppUser, UserRole } from '@/types'
import styles from './UserManagement.module.scss'

const ROLE_OPTIONS = (['admin', 'seventy', 'president'] as UserRole[]).map(r => ({ value: r, label: ROLE_LABELS[r] }))
const PRE_ROLE_OPTIONS = (['president', 'seventy'] as UserRole[]).map(r => ({ value: r, label: ROLE_LABELS[r] }))
const REGION_OPTIONS = REGIONS.map(r => ({ value: r.id, label: r.name }))
const UNIT_OPTIONS = ALL_UNITS.map(u => ({ value: u.id, label: u.name }))

function EditUserModal({
  user,
  onClose,
}: {
  user: AppUser
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<UserRole>(user.role)
  // Multi-region support for seventy
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(user.regionIds ?? (user.regionId ? [user.regionId] : []))
  )
  const [loading, setLoading] = useState(false)

  function toggleRegion(regionId: string) {
    setSelectedRegions(prev => {
      const next = new Set(prev)
      next.has(regionId) ? next.delete(regionId) : next.add(regionId)
      return next
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const tasks: Promise<void>[] = []
      if (name.trim() !== user.name) tasks.push(updateUserName(user.uid, name.trim()))
      const newRegionIds = Array.from(selectedRegions)
      const regionChanged = role === 'seventy' && (
        JSON.stringify(newRegionIds.sort()) !== JSON.stringify((user.regionIds ?? []).sort())
      )
      if (role !== user.role || regionChanged) {
        tasks.push(updateUserRole(user.uid, role, role === 'seventy' ? newRegionIds : undefined))
      }
      await Promise.all(tasks)
      toast.success(`${name}${t('user.editSuccess')}`)
      onClose()
    } catch {
      toast.error(t('user.editFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${t('user.editUser')} — ${user.name}`}>
      <form className={styles.editForm} onSubmit={handleSave}>
        <Input
          label={t('user.name')}
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <Select
          label={t('user.role')}
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          options={ROLE_OPTIONS}
        />
        {role === 'seventy' && (
          <div className={styles.regionCheckGroup}>
            <p className={styles.regionCheckLabel}>{t('user.inviteRegion')} (복수 선택 가능)</p>
            <div className={styles.regionCheckList}>
              {REGIONS.map(r => (
                <label key={r.id} className={styles.regionCheckRow}>
                  <input
                    type="checkbox"
                    checked={selectedRegions.has(r.id)}
                    onChange={() => toggleRegion(r.id)}
                    className={styles.regionCheckbox}
                    style={{ accentColor: 'var(--color-primary, #177C9C)' }}
                  />
                  <span className={styles.regionCheckName}>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteConfirmModal({
  user,
  onClose,
  onDeleted,
  deleteAction,
  confirmText,
  warningText,
  title,
}: {
  user: AppUser
  onClose: () => void
  onDeleted: () => void
  deleteAction?: () => Promise<void>
  confirmText?: string
  warningText?: string
  title?: string
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await (deleteAction ?? (() => deleteUserAccount(user.uid)))()
      toast.success(deleteAction ? t('user.preRegDeleteSuccess', { name: user.name }) : t('user.deleteSuccess'))
      onDeleted()
      onClose()
    } catch {
      toast.error(deleteAction ? t('user.preRegDeleteFailed') : t('user.deleteFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={title ?? t('user.deleteUser')}>
      <p className={styles.deleteDesc}>
        <strong>{user.name}</strong> ({user.email}) {confirmText ?? t('user.deleteConfirm')}<br />
        {warningText ?? t('user.deleteWarning')}
      </p>
      <div className={styles.modalActions}>
        <Button variant="ghost" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="danger" loading={loading} onClick={handleDelete}>{t('common.delete')}</Button>
      </div>
    </Modal>
  )
}

export function UserManagement() {
  const { t } = useTranslation()
  const currentUser = useAtomValue(authUserAtom)!
  const { users, loading: usersLoading } = useUsers()

  // Invite (email-based)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('president')
  const [regionId, setRegionId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  // Manual pre-registration
  const [preName, setPreName] = useState('')
  const [preEmail, setPreEmail] = useState('')
  const [preRole, setPreRole] = useState<'president' | 'seventy'>('president')
  const [preUnitId, setPreUnitId] = useState('')
  const [preRegionId, setPreRegionId] = useState('')
  const [preLoading, setPreLoading] = useState(false)

  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null)
  const [deletingPreReg, setDeletingPreReg] = useState<AppUser | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviteLoading(true)
    try {
      await inviteUser(email.trim(), role, role === 'seventy' ? regionId : undefined, currentUser.uid)
      toast.success(`${email}${t('user.inviteSuccess')}`)
      setEmail('')
      setRegionId('')
    } catch {
      toast.error(t('user.inviteFailed'))
    } finally {
      setInviteLoading(false)
    }
  }

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preName.trim()) return
    setPreLoading(true)
    try {
      await addPreRegisteredUser({
        name: preName.trim(),
        email: preEmail.trim(),
        role: preRole,
        ...(preRole === 'president' && preUnitId ? { unitId: preUnitId } : {}),
        ...(preRole === 'seventy' && preRegionId ? { regionId: preRegionId, regionIds: [preRegionId] } : {}),
      })
      toast.success(t('user.preRegSuccess', { name: preName.trim() }))
      setPreName(''); setPreEmail(''); setPreUnitId(''); setPreRegionId('')
    } catch {
      toast.error(t('user.preRegFailed'))
    } finally {
      setPreLoading(false)
    }
  }


  return (
    <AppShell role={currentUser.role} name={currentUser.name} topBar={<TopBar name={currentUser.name} subtext={t('admin.users')} />}>
      <div className={styles.page}>
        <div className={styles.inviteCol}>
          <Card>
            <CardHeader title={t('user.invite')} />
            <CardBody>
              <form className={styles.form} onSubmit={handleInvite}>
                <Input label={t('user.inviteEmail')} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" required />
                <Select label={t('user.inviteRole')} value={role} onChange={e => setRole(e.target.value as UserRole)} options={ROLE_OPTIONS} />
                {role === 'seventy' && (
                  <Select label={t('user.inviteRegion')} value={regionId} onChange={e => setRegionId(e.target.value)} options={REGION_OPTIONS} />
                )}
                <Button type="submit" loading={inviteLoading}>{t('user.inviteSend')}</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('user.preRegister')} />
            <CardBody>
              <p className={styles.preRegDesc}>{t('user.preRegDesc')}</p>
              <form className={styles.form} onSubmit={handlePreRegister}>
                <Input label={t('user.name')} value={preName} onChange={e => setPreName(e.target.value)} required />
                <Input label={t('user.preRegEmail')} type="email" value={preEmail} onChange={e => setPreEmail(e.target.value)} placeholder="example@gmail.com" />
                <Select label={t('user.role')} value={preRole} onChange={e => setPreRole(e.target.value as 'president' | 'seventy')} options={PRE_ROLE_OPTIONS} />
                {preRole === 'president' && (
                  <Select label={t('user.preRegUnit')} value={preUnitId} onChange={e => setPreUnitId(e.target.value)} options={UNIT_OPTIONS} />
                )}
                {preRole === 'seventy' && (
                  <Select label={t('user.preRegRegion')} value={preRegionId} onChange={e => setPreRegionId(e.target.value)} options={REGION_OPTIONS} />
                )}
                <Button type="submit" loading={preLoading}>{t('user.preRegSubmit')}</Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className={styles.listCol}>
          <Card>
            <CardHeader title={t('user.allUsers')} />
            <CardBody>
              {usersLoading
                ? [1, 2, 3].map(i => <Skeleton key={i} height="44px" className={styles.skeletonRow} />)
                : users.map(u => (
                    <div key={u.uid} className={styles.userRow}>
                      <Avatar name={u.name} size="sm" />
                      <div className={styles.userInfo}>
                        <p className={styles.userName}>
                          {u.name}
                          {!u.preRegistered && <CheckCircle2 size={13} className={styles.verifiedIcon} />}
                        </p>
                        <p className={styles.userEmail}>{u.email || '—'}</p>
                      </div>
                      <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'seventy' ? 'warning' : 'default'}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      <div className={styles.userActions}>
                        {!u.preRegistered && (
                          <button
                            className={styles.iconBtn}
                            title={t('common.edit')}
                            type="button"
                            onClick={() => setEditingUser(u)}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {u.uid !== currentUser.uid && (
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title={t('common.delete')}
                            type="button"
                            onClick={() => u.preRegistered ? setDeletingPreReg(u) : setDeletingUser(u)}
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
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => setDeletingUser(null)}
        />
      )}
      {deletingPreReg && (
        <DeleteConfirmModal
          user={deletingPreReg}
          onClose={() => setDeletingPreReg(null)}
          onDeleted={() => setDeletingPreReg(null)}
          deleteAction={() => deletePreRegisteredUser(deletingPreReg.uid)}
          title={t('user.preRegister')}
          confirmText={t('user.preRegDeleteConfirm')}
          warningText={t('user.preRegDeleteWarning')}
        />
      )}
    </AppShell>
  )
}
