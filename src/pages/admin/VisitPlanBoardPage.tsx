import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import {
  getVisitPlan, updateVisitPlanItems, deleteVisitPlan, publishVisitPlan, updateVisitPlanProject,
} from '@/services/visitPlanService'
import { deleteScheduleViaCF } from '@/services/scheduleService'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { useVisitPlanContext } from '@/hooks/useVisitPlanContext'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, Spinner, DeleteConfirmSheet } from '@/components/ui'
import { AddVisitPanel, PlanItemList, BalancePanel, ProjectPicker } from '@/components/domain'
import type { VisitPlan, VisitPlanItem } from '@/types'
import styles from './VisitPlanBoardPage.module.scss'

function uid(): string {
  return `it_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function VisitPlanBoardPage() {
  const { t } = useTranslation()
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!

  const [plan, setPlan] = useState<VisitPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { pendingIds: deletingPlanIds, scheduleDelete: schedulePlanDelete } = useDeleteWithUndo()

  useEffect(() => {
    if (!planId) return
    getVisitPlan(planId).then(p => { setPlan(p); setLoadingPlan(false) })
  }, [planId])

  const items = plan?.items ?? []
  const { loading: ctxLoading, staleWards, lastVisitByWard, balance, generalSchedules } =
    useVisitPlanContext(plan?.seventyUid, items)

  const persist = async (planId: string, nextItems: VisitPlanItem[]) => {
    setPlan(prev => (prev ? { ...prev, items: nextItems } : prev))
    await updateVisitPlanItems(planId, nextItems)
  }

  const handleAdd = (partial: Omit<VisitPlanItem, 'itemId' | 'scheduleId'>) => {
    if (!plan) return
    persist(plan.id, [...(plan.items ?? []), { ...partial, itemId: uid() }])
  }

  const handleRemove = (itemId: string) => {
    if (!plan) return
    const target = (plan.items ?? []).find(i => i.itemId === itemId)
    const filtered = (plan.items ?? []).filter(i => i.itemId !== itemId)
    schedulePlanDelete(itemId, async () => {
      if (target?.scheduleId) {
        try { await deleteScheduleViaCF(target.scheduleId) } catch { /* already deleted */ }
      }
      await updateVisitPlanItems(plan.id, filtered)
    }, t('common.deleted'))
  }

  const handlePublish = async () => {
    if (!plan) return
    if (!confirm(t('visitPlan.publishConfirm'))) return
    setPublishing(true)
    try {
      await publishVisitPlan(plan.id)
      const fresh = await getVisitPlan(plan.id)
      setPlan(fresh)
      toast.success(t('visitPlan.publishSuccess'))
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? '발행에 실패했습니다.')
    } finally {
      setPublishing(false)
    }
  }

  const handleDeletePlan = () => {
    if (!plan) return
    schedulePlanDelete(plan.id, async () => {
      for (const it of plan.items) {
        if (it.scheduleId) {
          try { await deleteScheduleViaCF(it.scheduleId) } catch { /* already deleted */ }
        }
      }
      await deleteVisitPlan(plan.id)
      navigate('/admin/visit-plans')
    }, t('common.deleted'))
  }

  if (loadingPlan) {
    return <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} />}><div className={styles.center}><Spinner /></div></AppShell>
  }
  if (!plan) {
    return <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} />}><div className={styles.center}>{t('visitPlan.empty')}</div></AppShell>
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={plan.title} />}>
      <div className={styles.page}>
        <div className={styles.header}>
          <h2 className={styles.title}>{plan.title}</h2>
          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={deletingPlanIds.has(plan.id)}>{t('common.delete')}</Button>
            <Button size="sm" onClick={handlePublish} loading={publishing} disabled={savingProject}>{t('visitPlan.publish')}</Button>
          </div>
        </div>

        <ProjectPicker
          value={plan.projectId ?? ''}
          onChange={async pid => {
            setPlan(prev => (prev ? { ...prev, projectId: pid } : prev))
            setSavingProject(true)
            try { await updateVisitPlanProject(plan.id, pid) } finally { setSavingProject(false) }
          }}
        />

        <div className={styles.grid}>
          <Card>
            <CardHeader title={`${t('visitPlan.plannedVisits')} (${items.length})`} />
            <CardBody>
              <PlanItemList
                items={items}
                lastVisitByWard={lastVisitByWard}
                generalSchedules={generalSchedules}
                onRemove={handleRemove}
                pendingDeleteIds={deletingPlanIds}
              />
            </CardBody>
          </Card>

          <div className={styles.side}>
            <Card>
              <CardBody>
                {ctxLoading
                  ? <div className={styles.center}><Spinner /></div>
                  : <AddVisitPanel staleWards={staleWards} onAdd={handleAdd} />}
              </CardBody>
            </Card>
            <Card>
              <CardBody><BalancePanel balance={balance} /></CardBody>
            </Card>
          </div>
        </div>
      </div>
      <DeleteConfirmSheet
        open={showDeleteConfirm}
        description={plan.title}
        onConfirm={() => { setShowDeleteConfirm(false); handleDeletePlan() }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </AppShell>
  )
}
