import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useProjects } from '@/hooks/useProjects'
import { createProject, updateProject } from '@/services/projectService'
import { planProjectDetailPath } from '@/router/routes'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Badge,
  EmptyState,
  LoadingState,
} from '@/components/ui'
import type { ProjectStatus } from '@/types'
import styles from './ProjectPanel.module.scss'

const STATUS_VARIANT: Record<ProjectStatus, 'success' | 'default' | 'warning'> = {
  active: 'default',
  done: 'success',
  dropped: 'warning',
}

export function ProjectPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!
  const { projects, loading } = useProjects()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      await createProject(title.trim(), notes.trim(), user.uid)
      setTitle('')
      setNotes('')
    } catch {
      toast.error(t('project.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'active', label: t('project.status.active') },
    { value: 'done', label: t('project.status.done') },
    { value: 'dropped', label: t('project.status.dropped') },
  ]

  return (
    <div className={styles.panel}>
      <Card>
        <CardHeader title={t('project.newProject')} />
        <CardBody>
          <div className={styles.form}>
            <Input
              label={t('project.titleLabel')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label={t('project.notesLabel')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button onClick={handleCreate} loading={creating} disabled={!title.trim()}>
              {t('project.create')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('project.listTitle')} />
        <CardBody>
          {loading && <LoadingState shape="list" rows={3} />}
          {!loading && projects.length === 0 && <EmptyState title={t('project.empty')} />}
          {!loading &&
            projects.map((p) => (
              <div key={p.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowMain}
                  onClick={() => navigate(planProjectDetailPath(p.id))}
                >
                  <span className={styles.rowTitle}>{p.title}</span>
                  <Badge variant={STATUS_VARIANT[p.status]}>
                    {t(`project.status.${p.status}`)}
                  </Badge>
                </button>
                <select
                  className={styles.statusSelect}
                  value={p.status}
                  onChange={(e) => updateProject(p.id, { status: e.target.value as ProjectStatus })}
                  aria-label={t('project.statusLabel')}
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </CardBody>
      </Card>
    </div>
  )
}
