import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { addPreRegisteredUser } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { ROLE } from '@/constants/roles'
import { Card, CardHeader, CardBody, Input, Select, Button } from '@/components/ui'
import { RegionCheckboxes } from './RegionCheckboxes'
import { PRE_ROLE_OPTIONS, UNIT_OPTIONS } from './userOptions'
import styles from './users.module.scss'

/**
 * UserManagement.tsx의 수동 사전등록 폼 — state 356-362, `togglePreRegion` 372-379,
 * `handlePreRegister` 432-464, JSX 573-641에서 옮겨왔다.
 */
export function PreRegisterCard() {
  const { t } = useTranslation()
  const { users } = useUsers()
  const seventyOptions = users
    .filter((u) => u.role === ROLE.SEVENTY)
    .map((u) => ({ value: u.uid, label: u.name }))

  const [preName, setPreName] = useState('')
  const [preEmail, setPreEmail] = useState('')
  const [preRole, setPreRole] = useState<'president' | 'seventy' | 'exec_secretary'>('president')
  const [preUnitId, setPreUnitId] = useState('')
  const [preRegionIds, setPreRegionIds] = useState<Set<string>>(new Set())
  const [preSeventyUid, setPreSeventyUid] = useState('')
  const [preLoading, setPreLoading] = useState(false)

  function togglePreRegion(id: string) {
    setPreRegionIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preName.trim()) return
    if (preRole === 'exec_secretary' && !preSeventyUid) {
      toast.error(t('user.preRegExecSecretaryNeedsSeventy'))
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
        ...(preRole === 'exec_secretary' && preSeventyUid
          ? { assignedSeventyUid: preSeventyUid }
          : {}),
      })
      toast.success(t('user.preRegSuccess', { name: preName.trim() }))
      setPreName('')
      setPreEmail('')
      setPreUnitId('')
      setPreRegionIds(new Set())
      setPreSeventyUid('')
    } catch {
      toast.error(t('user.preRegFailed'))
    } finally {
      setPreLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader title={t('user.preRegister')} />
      <CardBody>
        <p className={styles.preRegDesc}>{t('user.preRegDesc')}</p>
        <form className={styles.form} onSubmit={handlePreRegister}>
          <Input
            label={t('user.name')}
            value={preName}
            onChange={(e) => setPreName(e.target.value)}
            required
          />
          <Input
            label={t('user.preRegEmail')}
            type="email"
            value={preEmail}
            onChange={(e) => setPreEmail(e.target.value)}
            placeholder="example@gmail.com"
          />
          <Select
            label={t('user.role')}
            value={preRole}
            onChange={(e) =>
              setPreRole(e.target.value as 'president' | 'seventy' | 'exec_secretary')
            }
            options={PRE_ROLE_OPTIONS}
          />
          {preRole === 'president' && (
            <Select
              label={t('user.preRegUnit')}
              value={preUnitId}
              onChange={(e) => setPreUnitId(e.target.value)}
              options={UNIT_OPTIONS}
            />
          )}
          {preRole === 'exec_secretary' && (
            <Select
              label={t('user.inviteAssignedSeventy')}
              value={preSeventyUid}
              onChange={(e) => setPreSeventyUid(e.target.value)}
              options={seventyOptions}
            />
          )}
          {preRole === 'seventy' && (
            <RegionCheckboxes
              selected={preRegionIds}
              onToggle={togglePreRegion}
              labelKey="user.preRegRegion"
            />
          )}
          <Button type="submit" loading={preLoading}>
            {t('user.preRegSubmit')}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
