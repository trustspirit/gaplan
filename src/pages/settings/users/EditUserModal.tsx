import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  updateUserRole,
  updateUserName,
  updatePreRegisteredUserFields,
} from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { ROLE } from '@/constants/roles'
import { Input, Select, Button, Modal } from '@/components/ui'
import type { AppUser, UserRole, SecondaryRole } from '@/types'
import { RegionCheckboxes } from './RegionCheckboxes'
import {
  ROLE_OPTIONS,
  PRE_ROLE_OPTIONS,
  UNIT_OPTIONS,
  getSecondaryRoleOptions,
} from './userOptions'
import type { SecondaryRoleOrNull } from './userOptions'
import styles from './users.module.scss'

/**
 * UserManagement.tsx 52-280에서 옮겨왔다. 로직은 그대로다 — 지역 체크박스 두 곳만
 * RegionCheckboxes로 바꿨다.
 */
export function EditUserModal({
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
    new Set(user.regionIds ?? (user.regionId ? [user.regionId] : [])),
  )
  const [assignedSeventyUid, setAssignedSeventyUid] = useState(user.assignedSeventyUid ?? '')
  const [secondaryRole, setSecondaryRole] = useState<SecondaryRoleOrNull>(
    user.secondaryRole ?? null,
  )
  const [loading, setLoading] = useState(false)

  const { users: allUsers } = useUsers()
  const seventyOptions = allUsers
    .filter((u) => u.role === ROLE.SEVENTY)
    .map((u) => ({ value: u.uid, label: u.name }))

  const SECONDARY_ROLE_OPTIONS = getSecondaryRoleOptions(t)

  function toggleRegion(regionId: string) {
    setSelectedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(regionId)) next.delete(regionId)
      else next.add(regionId)
      return next
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (role === 'exec_secretary' && !assignedSeventyUid) {
        toast.error(t('user.editExecSecretaryNeedsSeventy'))
        return
      }
      if (role === 'admin' && secondaryRole === 'exec_secretary' && !assignedSeventyUid) {
        toast.error(t('user.secondaryExecSecretaryNeedsSeventy'))
        return
      }
      const tasks: Promise<void>[] = []
      if (name.trim() !== user.name) tasks.push(updateUserName(user.uid, name.trim()))
      const newRegionIds = Array.from(selectedRegions)
      const regionChanged =
        (role === 'seventy' || (role === 'admin' && secondaryRole === 'seventy')) &&
        JSON.stringify([...newRegionIds].sort()) !==
          JSON.stringify([...(user.regionIds ?? [])].sort())
      const seventyChanged =
        (role === 'exec_secretary' || (role === 'admin' && secondaryRole === 'exec_secretary')) &&
        assignedSeventyUid !== (user.assignedSeventyUid ?? '')
      const secondaryChanged = role === 'admin' && secondaryRole !== (user.secondaryRole ?? null)
      const unitChanged =
        role === 'admin' && secondaryRole === 'president' && unitId !== (user.unitId ?? '')
      if (
        role !== user.role ||
        regionChanged ||
        seventyChanged ||
        secondaryChanged ||
        unitChanged
      ) {
        tasks.push(
          updateUserRole(
            user.uid,
            role,
            role === 'seventy'
              ? newRegionIds
              : secondaryRole === 'seventy'
                ? newRegionIds
                : undefined,
            role === 'exec_secretary'
              ? assignedSeventyUid || undefined
              : secondaryRole === 'exec_secretary'
                ? assignedSeventyUid || undefined
                : undefined,
            role === 'admin' ? secondaryRole : null,
            secondaryRole === 'president' ? unitId || undefined : undefined,
          ),
        )
      }
      if (user.preRegistered) {
        const preFields: Parameters<typeof updatePreRegisteredUserFields>[1] = {}
        if (email.trim().toLowerCase() !== (user.email ?? '').toLowerCase())
          preFields.email = email.trim()
        // Save unitId for president; clear it when switching away from president
        if (role === 'president') {
          if (unitId !== (user.unitId ?? '')) preFields.unitId = unitId || null
        } else if (user.role === 'president') {
          preFields.unitId = null
        }
        if (Object.keys(preFields).length > 0)
          tasks.push(updatePreRegisteredUserFields(user.uid, preFields))
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
          onChange={(e) => setName(e.target.value)}
          required
        />
        {user.preRegistered && (
          <Input
            label={t('user.preRegEmail')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
          />
        )}
        <Select
          label={t('user.role')}
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={user.preRegistered ? PRE_ROLE_OPTIONS : ROLE_OPTIONS}
          disabled={isSelf}
        />
        {user.preRegistered && role === 'president' && (
          <Select
            label={t('user.preRegUnit')}
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            options={UNIT_OPTIONS}
          />
        )}
        {role === 'seventy' && (
          <RegionCheckboxes selected={selectedRegions} onToggle={toggleRegion} />
        )}
        {role === 'exec_secretary' && (
          <Select
            label={t('user.editAssignedSeventy')}
            value={assignedSeventyUid}
            onChange={(e) => setAssignedSeventyUid(e.target.value)}
            options={seventyOptions}
          />
        )}
        {role === 'admin' && (
          <>
            <Select
              label={t('user.secondaryRole')}
              value={secondaryRole ?? ''}
              onChange={(e) => setSecondaryRole((e.target.value as SecondaryRole) || null)}
              options={SECONDARY_ROLE_OPTIONS}
              disabled={isSelf}
            />
            {secondaryRole === 'exec_secretary' && (
              <Select
                label={t('user.editAssignedSeventy')}
                value={assignedSeventyUid}
                onChange={(e) => setAssignedSeventyUid(e.target.value)}
                options={seventyOptions}
              />
            )}
            {secondaryRole === 'seventy' && (
              <RegionCheckboxes selected={selectedRegions} onToggle={toggleRegion} />
            )}
            {secondaryRole === 'president' && (
              <Select
                label={t('user.preRegUnit')}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                options={UNIT_OPTIONS}
              />
            )}
          </>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
