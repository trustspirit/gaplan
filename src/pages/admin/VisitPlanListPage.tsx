import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useVisitPlans } from '@/hooks/useVisitPlans'
import { useUsers } from '@/hooks/useUsers'
import { createVisitPlan } from '@/services/visitPlanService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, Input, Select, Badge } from '@/components/ui'
import styles from './VisitPlanListPage.module.scss'

export function VisitPlanListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!
  const { plans, loading } = useVisitPlans()
  const { users } = useUsers()
  const seventies = users.filter(u => u.role === 'seventy')

  const [title, setTitle] = useState('')
  const [seventyUid, setSeventyUid] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !seventyUid) return
    setCreating(true)
    try {
      const id = await createVisitPlan(title.trim(), seventyUid, user.uid)
      navigate(`/admin/visit-plans/${id}`)
    } catch {
      toast.error('생성에 실패했습니다.')
      setCreating(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('visitPlan.listSubtext')} />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title={t('visitPlan.newPlan')} />
          <CardBody>
            <div className={styles.form}>
              <Input label={t('visitPlan.planTitle')} value={title} onChange={e => setTitle(e.target.value)} />
              <Select
                label={t('visitPlan.seventy')}
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={[{ value: '', label: '—' }, ...seventies.map(s => ({ value: s.uid, label: s.name }))]}
              />
              <Button onClick={handleCreate} loading={creating} disabled={!title.trim() || !seventyUid}>
                {t('visitPlan.create')}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('visitPlan.listTitle')} />
          <CardBody>
            {loading && <p className={styles.empty}>…</p>}
            {!loading && plans.length === 0 && <p className={styles.empty}>{t('visitPlan.empty')}</p>}
            {plans.map(p => {
              const seventy = seventies.find(s => s.uid === p.seventyUid)
              return (
                <button key={p.id} type="button" className={styles.row} onClick={() => navigate(`/admin/visit-plans/${p.id}`)}>
                  <span className={styles.rowTitle}>{p.title}</span>
                  <span className={styles.rowMeta}>
                    {seventy?.name ?? '—'} · {p.items.length} · {dayjs(p.createdAt).isValid() ? dayjs(p.createdAt).format('YYYY.M.D') : ''}
                  </span>
                  <Badge variant={p.status === 'published' ? 'success' : 'default'}>
                    {p.status === 'published' ? t('visitPlan.published') : t('visitPlan.draft')}
                  </Badge>
                </button>
              )
            })}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
