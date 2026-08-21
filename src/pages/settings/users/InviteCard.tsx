import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { inviteUser } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { ROLE } from '@/constants/roles'
import { Card, CardHeader, CardBody, Input, Select, Button } from '@/components/ui'
import type { UserRole, SecondaryRole } from '@/types'
import { RegionCheckboxes } from './RegionCheckboxes'
import { ROLE_OPTIONS, UNIT_OPTIONS, getSecondaryRoleOptions } from './userOptions'
import type { SecondaryRoleOrNull } from './userOptions'
import styles from './users.module.scss'

export function InviteCard() {
  const { t } = useTranslation()
  const currentUser = useAtomValue(authUserAtom)!
  const { users } = useUsers()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('president')
  const [inviteRegionIds, setInviteRegionIds] = useState<Set<string>>(new Set())
  const [inviteSeventyUid, setInviteSeventyUid] = useState('')
  const [inviteSecondaryRole, setInviteSecondaryRole] = useState<SecondaryRoleOrNull>(null)
  const [inviteUnitId, setInviteUnitId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const seventyUsers = users.filter((u) => u.role === ROLE.SEVENTY)
  const seventyOptions = seventyUsers.map((u) => ({ value: u.uid, label: u.name }))

  const SECONDARY_ROLE_OPTIONS = getSecondaryRoleOptions(t)

  function toggleInviteRegion(id: string) {
    setInviteRegionIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviteLoading(true)
    if (role === 'exec_secretary' && !inviteSeventyUid) {
      toast.error(t('user.inviteExecSecretaryNeedsSeventy'))
      setInviteLoading(false)
      return
    }
    if (role === 'admin' && inviteSecondaryRole === 'exec_secretary' && !inviteSeventyUid) {
      toast.error(t('user.secondaryExecSecretaryNeedsSeventy'))
      setInviteLoading(false)
      return
    }
    try {
      await inviteUser(
        email.trim(),
        role,
        role === 'seventy'
          ? Array.from(inviteRegionIds)
          : role === 'admin' && inviteSecondaryRole === 'seventy'
            ? Array.from(inviteRegionIds)
            : undefined,
        currentUser.uid,
        role === 'exec_secretary'
          ? inviteSeventyUid || undefined
          : role === 'admin' && inviteSecondaryRole === 'exec_secretary'
            ? inviteSeventyUid || undefined
            : undefined,
        role === 'admin' ? inviteSecondaryRole : null,
        role === 'admin' && inviteSecondaryRole === 'president'
          ? inviteUnitId || undefined
          : undefined,
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

  return (
    <Card>
      <CardHeader title={t('user.invite')} />
      <CardBody>
        <form className={styles.form} onSubmit={handleInvite}>
          <Input
            label={t('user.inviteEmail')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            required
          />
          <Select
            label={t('user.inviteRole')}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={ROLE_OPTIONS}
          />
          {role === 'seventy' && (
            <RegionCheckboxes selected={inviteRegionIds} onToggle={toggleInviteRegion} />
          )}
          {role === 'exec_secretary' && (
            <Select
              label={t('user.inviteAssignedSeventy')}
              value={inviteSeventyUid}
              onChange={(e) => setInviteSeventyUid(e.target.value)}
              options={seventyOptions}
            />
          )}
          {role === 'admin' && (
            <>
              <Select
                label={t('user.secondaryRole')}
                value={inviteSecondaryRole ?? ''}
                onChange={(e) => setInviteSecondaryRole((e.target.value as SecondaryRole) || null)}
                options={SECONDARY_ROLE_OPTIONS}
              />
              {inviteSecondaryRole === 'exec_secretary' && (
                <Select
                  label={t('user.inviteAssignedSeventy')}
                  value={inviteSeventyUid}
                  onChange={(e) => setInviteSeventyUid(e.target.value)}
                  options={seventyOptions}
                />
              )}
              {inviteSecondaryRole === 'seventy' && (
                <RegionCheckboxes selected={inviteRegionIds} onToggle={toggleInviteRegion} />
              )}
              {inviteSecondaryRole === 'president' && (
                <Select
                  label={t('user.preRegUnit')}
                  value={inviteUnitId}
                  onChange={(e) => setInviteUnitId(e.target.value)}
                  options={UNIT_OPTIONS}
                />
              )}
            </>
          )}
          <Button type="submit" loading={inviteLoading}>
            {t('user.inviteSend')}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
