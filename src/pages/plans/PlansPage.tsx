import { useMemo } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useTopBar } from '@/hooks/useTopBar'
import { ForbiddenState, PageHeader, Tabs } from '@/components/ui'
import { VisitPlanPanel } from './VisitPlanPanel'
import { ProjectPanel } from './ProjectPanel'
import { TaskPanel } from './tasks/TaskPanel'
import { planTabBySlug, planTabsFor, type PlanTabId } from './planTabs'
import styles from './PlansPage.module.scss'

// 탭마다 상단바 도움말이 다르다. 세 화면이 각자 갖고 있던 키를 그대로 쓴다 —
// 화면이 합쳐졌다고 도움말 내용까지 뭉뚱그릴 이유는 없다.
const HELP_KEY: Record<PlanTabId, string> = {
  visitPlans: 'pageHelp.visitPlans',
  tasks: 'pageHelp.taskProgress',
  projects: 'pageHelp.projects',
}

export function PlansPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { tab: slug } = useParams<{ tab: string }>()

  const tabs = useMemo(() => planTabsFor(user.role), [user.role])
  const active = planTabBySlug(user.role, slug)

  // 훅은 조건부 반환보다 먼저 전부 부른다.
  useTopBar({
    subtext: t('plans.subtext'),
    helpInfoKey: active ? HELP_KEY[active.id] : undefined,
  })

  // 슬러그가 없거나, 오타이거나, 이 역할에 없는 탭이면 자기 첫 탭으로 보낸다.
  if (!active) {
    if (tabs.length === 0) return <ForbiddenState />
    return <Navigate to={tabs[0].path} replace />
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('plans.title')} />

      {/* 판정 R34 — 탭이 하나뿐인 역할에게는 탭리스트를 그리지 않는다. */}
      {tabs.length > 1 && (
        <Tabs
          className={styles.tabs}
          items={tabs.map((x) => ({ id: x.id, label: t(x.labelKey), href: x.path }))}
          activeId={active.id}
          aria-label={t('plans.tabsLabel')}
          renderLink={(item, children, props) => (
            <NavLink to={item.href!} {...props}>
              {children}
            </NavLink>
          )}
        />
      )}

      {active.id === 'visitPlans' && <VisitPlanPanel />}
      {active.id === 'tasks' && <TaskPanel />}
      {active.id === 'projects' && <ProjectPanel />}
    </div>
  )
}
