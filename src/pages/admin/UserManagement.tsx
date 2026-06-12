import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { inviteUser, updateUserRole, updateUserName, deleteUserAccount, addPreRegisteredUser, deletePreRegisteredUser, updatePreRegisteredUserFields } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { REGIONS, ALL_UNITS } from '@/constants/regions'
import { ROLE, ROLE_LABELS, MANAGEABLE_ROLES, PRE_REG_ROLES, SECONDARY_ROLES } from '@/constants/roles'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Select, Button, Badge, Avatar, Skeleton, Modal } from '@/components/ui'
import type { AppUser, UserRole, SecondaryRole } from '@/types'

type SecondaryRoleOrNull = SecondaryRole | null

const SECONDARY_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '없음' },
  ...SECONDARY_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] })),
]
import styles from './UserManagement.module.scss'

const ROLE_OPTIONS = MANAGEABLE_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))
const PRE_ROLE_OPTIONS = PRE_REG_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))
const UNIT_OPTIONS = ALL_UNITS.map(u => ({ value: u.id, label: u.name.ko }))

function EditUserModal({
  user,
  isSelf,
  onClose,
}: {
  user: AppUser
  isSelf?: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<UserRole>(user.role)
  const [email, setEmail] = useState(user.email ?? '')
  const [unitId, setUnitId] = useState(user.unitId ?? '')
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(user.regionIds ?? (user.regionId ? [user.regionId] : []))
  )
  const [assignedSeventyUid, setAssignedSeventyUid] = useState(user.assignedSeventyUid ?? '')
  const [secondaryRole, setSecondaryRole] = useState<SecondaryRoleOrNull>(user.secondaryRole ?? null)
  const [loading, setLoading] = useState(false)

  const { users: allUsers } = useUsers()
  const seventyOptions = allUsers
    .filter(u => u.role === ROLE.SEVENTY)
    .map(u => ({ value: u.uid, label: u.name }))

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
      if (role === 'exec_secretary' && !assignedSeventyUid) {
        toast.error('집행서기는 담당 지역 칠십인을 선택해야 합니다')
        return
      }
      if (role === 'admin' && secondaryRole === 'exec_secretary' && !assignedSeventyUid) {
        toast.error('집행서기 보조 역할에는 담당 지역 칠십인을 선택해야 합니다')
        return
      }
      const tasks: Promise<void>[] = []
      if (name.trim() !== user.name) tasks.push(updateUserName(user.uid, name.trim()))
      const newRegionIds = Array.from(selectedRegions)
      const regionChanged = (role === 'seventy' || (role === 'admin' && secondaryRole === 'seventy')) && (
        JSON.stringify([...newRegionIds].sort()) !== JSON.stringify([...(user.regionIds ?? [])].sort())
      )
      const seventyChanged = (role === 'exec_secretary' || (role === 'admin' && secondaryRole === 'exec_secretary')) &&
        assignedSeventyUid !== (user.assignedSeventyUid ?? '')
      const secondaryChanged = role === 'admin' && secondaryRole !== (user.secondaryRole ?? null)
      const unitChanged = role === 'admin' && secondaryRole === 'president' && unitId !== (user.unitId ?? '')
      if (role !== user.role || regionChanged || seventyChanged || secondaryChanged || unitChanged) {
        tasks.push(updateUserRole(
          user.uid,
          role,
          role === 'seventy' ? newRegionIds : (secondaryRole === 'seventy' ? newRegionIds : undefined),
          role === 'exec_secretary' ? assignedSeventyUid || undefined : (secondaryRole === 'exec_secretary' ? assignedSeventyUid || undefined : undefined),
          role === 'admin' ? secondaryRole : null,
          secondaryRole === 'president' ? unitId || undefined : undefined,
        ))
      }
      if (user.preRegistered) {
        const preFields: Parameters<typeof updatePreRegisteredUserFields>[1] = {}
        if (email.trim().toLowerCase() !== (user.email ?? '').toLowerCase()) preFields.email = email.trim()
        // Save unitId for president; clear it when switching away from president
        if (role === 'president') {
          if (unitId !== (user.unitId ?? '')) preFields.unitId = unitId || null
        } else if (user.role === 'president') {
          preFields.unitId = null
        }
        if (Object.keys(preFields).length > 0) tasks.push(updatePreRegisteredUserFields(user.uid, preFields))
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
        {user.preRegistered && (
          <Input
            label={t('user.preRegEmail')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="example@gmail.com"
          />
        )}
        <Select
          label={t('user.role')}
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          options={user.preRegistered ? PRE_ROLE_OPTIONS : ROLE_OPTIONS}
          disabled={isSelf}
        />
        {user.preRegistered && role === 'president' && (
          <Select
            label={t('user.preRegUnit')}
            value={unitId}
            onChange={e => setUnitId(e.target.value)}
            options={UNIT_OPTIONS}
          />
        )}
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
        {role === 'exec_secretary' && (
          <Select
            label={t('user.editAssignedSeventy')}
            value={assignedSeventyUid}
            onChange={e => setAssignedSeventyUid(e.target.value)}
            options={seventyOptions}
          />
        )}
        {role === 'admin' && (
          <>
            <Select
              label={t('user.secondaryRole')}
              value={secondaryRole ?? ''}
              onChange={e => setSecondaryRole((e.target.value as SecondaryRole) || null)}
              options={SECONDARY_ROLE_OPTIONS}
              disabled={isSelf}
            />
            {secondaryRole === 'exec_secretary' && (
              <Select
                label={t('user.editAssignedSeventy')}
                value={assignedSeventyUid}
                onChange={e => setAssignedSeventyUid(e.target.value)}
                options={seventyOptions}
              />
            )}
            {secondaryRole === 'seventy' && (
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
            {secondaryRole === 'president' && (
              <Select
                label={t('user.preRegUnit')}
                value={unitId}
                onChange={e => setUnitId(e.target.value)}
                options={UNIT_OPTIONS}
              />
            )}
          </>
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
  const [inviteRegionIds, setInviteRegionIds] = useState<Set<string>>(new Set())
  const [inviteSeventyUid, setInviteSeventyUid] = useState('')
  const [inviteSecondaryRole, setInviteSecondaryRole] = useState<SecondaryRoleOrNull>(null)
  const [inviteUnitId, setInviteUnitId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const seventyUsers = users.filter(u => u.role === ROLE.SEVENTY)
  const seventyOptions = seventyUsers.map(u => ({ value: u.uid, label: u.name }))

  // Manual pre-registration
  const [preName, setPreName] = useState('')
  const [preEmail, setPreEmail] = useState('')
  const [preRole, setPreRole] = useState<'president' | 'seventy' | 'exec_secretary'>('president')
  const [preUnitId, setPreUnitId] = useState('')
  const [preRegionIds, setPreRegionIds] = useState<Set<string>>(new Set())
  const [preSeventyUid, setPreSeventyUid] = useState('')
  const [preLoading, setPreLoading] = useState(false)

  function toggleInviteRegion(id: string) {
    setInviteRegionIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function togglePreRegion(id: string) {
    setPreRegionIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null)
  const [deletingPreReg, setDeletingPreReg] = useState<AppUser | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviteLoading(true)
    if (role === 'exec_secretary' && !inviteSeventyUid) {
      toast.error('집행서기 초대 시 담당 지역 칠십인을 선택해야 합니다')
      setInviteLoading(false)
      return
    }
    if (role === 'admin' && inviteSecondaryRole === 'exec_secretary' && !inviteSeventyUid) {
      toast.error('집행서기 보조 역할에는 담당 지역 칠십인을 선택해야 합니다')
      setInviteLoading(false)
      return
    }
    try {
      await inviteUser(
        email.trim(),
        role,
        role === 'seventy' ? Array.from(inviteRegionIds)
          : (role === 'admin' && inviteSecondaryRole === 'seventy' ? Array.from(inviteRegionIds) : undefined),
        currentUser.uid,
        role === 'exec_secretary' ? inviteSeventyUid || undefined
          : (role === 'admin' && inviteSecondaryRole === 'exec_secretary' ? inviteSeventyUid || undefined : undefined),
        role === 'admin' ? inviteSecondaryRole : null,
        role === 'admin' && inviteSecondaryRole === 'president' ? inviteUnitId || undefined : undefined,
      )
      toast.success(`${email}${t('user.inviteSuccess')}`)
      setEmail('')
      setInviteRegionIds(new Set())
      setInviteSeventyUid('')
      setInviteSecondaryRole(null)
      setInviteUnitId('')
    } catch {
      toast.error(t('user.inviteFailed'))
    } finally {
      setInviteLoading(false)
    }
  }

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preName.trim()) return
    if (preRole === 'exec_secretary' && !preSeventyUid) {
      toast.error('집행서기 등록 시 담당 칠십인을 선택해야 합니다')
      return
    }
    setPreLoading(true)
    try {
      await addPreRegisteredUser({
        name: preName.trim(),
        email: preEmail.trim(),
        role: preRole,
        ...(preRole === 'president' && preUnitId ? { unitId: preUnitId } : {}),
        ...(preRole === 'seventy' && preRegionIds.size > 0
          ? { regionIds: Array.from(preRegionIds), regionId: Array.from(preRegionIds)[0] }
          : {}),
        ...(preRole === 'exec_secretary' && preSeventyUid ? { assignedSeventyUid: preSeventyUid } : {}),
      })
      toast.success(t('user.preRegSuccess', { name: preName.trim() }))
      setPreName(''); setPreEmail(''); setPreUnitId(''); setPreRegionIds(new Set()); setPreSeventyUid('')
    } catch {
      toast.error(t('user.preRegFailed'))
    } finally {
      setPreLoading(false)
    }
  }


  return (
    <AppShell role={currentUser.role} name={currentUser.name} topBar={<TopBar name={currentUser.name} subtext={t('admin.users')} helpInfoKey="pageHelp.users" />}>
      <div className={styles.page}>
        <div className={styles.inviteCol}>
          <Card>
            <CardHeader title={t('user.invite')} />
            <CardBody>
              <form className={styles.form} onSubmit={handleInvite}>
                <Input label={t('user.inviteEmail')} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" required />
                <Select label={t('user.inviteRole')} value={role} onChange={e => setRole(e.target.value as UserRole)} options={ROLE_OPTIONS} />
                {role === 'seventy' && (
                  <div className={styles.regionCheckGroup}>
                    <p className={styles.regionCheckLabel}>{t('user.inviteRegion')} (복수 선택 가능)</p>
                    <div className={styles.regionCheckList}>
                      {REGIONS.map(r => (
                        <label key={r.id} className={styles.regionCheckRow}>
                          <input
                            type="checkbox"
                            checked={inviteRegionIds.has(r.id)}
                            onChange={() => toggleInviteRegion(r.id)}
                            className={styles.regionCheckbox}
                            style={{ accentColor: 'var(--color-primary, #177C9C)' }}
                          />
                          <span className={styles.regionCheckName}>{r.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {role === 'exec_secretary' && (
                  <Select
                    label={t('user.inviteAssignedSeventy')}
                    value={inviteSeventyUid}
                    onChange={e => setInviteSeventyUid(e.target.value)}
                    options={seventyOptions}
                  />
                )}
                {role === 'admin' && (
                  <>
                    <Select
                      label={t('user.secondaryRole')}
                      value={inviteSecondaryRole ?? ''}
                      onChange={e => setInviteSecondaryRole((e.target.value as SecondaryRole) || null)}
                      options={SECONDARY_ROLE_OPTIONS}
                    />
                    {inviteSecondaryRole === 'exec_secretary' && (
                      <Select
                        label={t('user.inviteAssignedSeventy')}
                        value={inviteSeventyUid}
                        onChange={e => setInviteSeventyUid(e.target.value)}
                        options={seventyOptions}
                      />
                    )}
                    {inviteSecondaryRole === 'seventy' && (
                      <div className={styles.regionCheckGroup}>
                        <p className={styles.regionCheckLabel}>{t('user.inviteRegion')} (복수 선택 가능)</p>
                        <div className={styles.regionCheckList}>
                          {REGIONS.map(r => (
                            <label key={r.id} className={styles.regionCheckRow}>
                              <input
                                type="checkbox"
                                checked={inviteRegionIds.has(r.id)}
                                onChange={() => toggleInviteRegion(r.id)}
                                className={styles.regionCheckbox}
                                style={{ accentColor: 'var(--color-primary, #177C9C)' }}
                              />
                              <span className={styles.regionCheckName}>{r.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {inviteSecondaryRole === 'president' && (
                      <Select
                        label={t('user.preRegUnit')}
                        value={inviteUnitId}
                        onChange={e => setInviteUnitId(e.target.value)}
                        options={UNIT_OPTIONS}
                      />
                    )}
                  </>
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
                <Select label={t('user.role')} value={preRole} onChange={e => setPreRole(e.target.value as 'president' | 'seventy' | 'exec_secretary')} options={PRE_ROLE_OPTIONS} />
                {preRole === 'president' && (
                  <Select label={t('user.preRegUnit')} value={preUnitId} onChange={e => setPreUnitId(e.target.value)} options={UNIT_OPTIONS} />
                )}
                {preRole === 'exec_secretary' && (
                  <Select
                    label={t('user.inviteAssignedSeventy')}
                    value={preSeventyUid}
                    onChange={e => setPreSeventyUid(e.target.value)}
                    options={seventyOptions}
                  />
                )}
                {preRole === 'seventy' && (
                  <div className={styles.regionCheckGroup}>
                    <p className={styles.regionCheckLabel}>{t('user.preRegRegion')} (복수 선택 가능)</p>
                    <div className={styles.regionCheckList}>
                      {REGIONS.map(r => (
                        <label key={r.id} className={styles.regionCheckRow}>
                          <input
                            type="checkbox"
                            checked={preRegionIds.has(r.id)}
                            onChange={() => togglePreRegion(r.id)}
                            className={styles.regionCheckbox}
                            style={{ accentColor: 'var(--color-primary, #177C9C)' }}
                          />
                          <span className={styles.regionCheckName}>{r.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
                        <button
                          className={styles.iconBtn}
                          title={t('common.edit')}
                          type="button"
                          onClick={() => setEditingUser(u)}
                        >
                          <Pencil size={14} />
                        </button>
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
          isSelf={editingUser.uid === currentUser.uid}
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
