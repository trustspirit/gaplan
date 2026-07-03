import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { authUserAtom } from '@/store/authAtom'
import { getProject, updateProject, deleteProject } from '@/services/projectService'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, Input, Spinner } from '@/components/ui'
import type { Project, ProjectStatus, Schedule } from '@/types'
import styles from './ProjectDetailPage.module.scss'

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!

  const [project, setProject] = useState<Project | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const { pendingIds: deletingIds, scheduleDelete } = useDeleteWithUndo()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setLoadError(false)
    Promise.all([
      getProject(id),
      getDocs(query(collection(db, 'schedules'), where('projectId', '==', id))),
    ]).then(([p, snap]) => {
      setProject(p)
      if (p) { setTitle(p.title); setNotes(p.notes ?? ''); setStatus(p.status) }
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Schedule))
      setLoading(false)
    }).catch(() => {
      setLoadError(true)
      setLoading(false)
    })
  }, [id, reloadKey])

  const handleSave = async () => {
    if (!project) return
    try {
      await updateProject(project.id, { title: title.trim(), notes: notes.trim(), status })
      toast.success(t('project.save'))
    } catch {
      toast.error(t('common.saveFailed'))
    }
  }

  const handleDelete = () => {
    if (!project) return
    scheduleDelete(project.id, async () => {
      await deleteProject(project.id)
      navigate('/admin/projects')
    }, t('common.deleted'))
  }

  if (loading) {
    return <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} />}><div className={styles.center}><Spinner /></div></AppShell>
  }
  if (loadError) {
    return (
      <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} />}>
        <div className={styles.center}>
          <p>{t('common.loadFailed')}</p>
          <Button size="sm" onClick={() => setReloadKey(k => k + 1)}>{t('common.retry')}</Button>
        </div>
      </AppShell>
    )
  }
  if (!project) {
    return <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} />}><div className={styles.center}>{t('project.empty')}</div></AppShell>
  }

  const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={project.title} />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title={project.title} />
          <CardBody>
            <div className={styles.form}>
              <Input label={t('project.titleLabel')} value={title} onChange={e => setTitle(e.target.value)} />
              <Input label={t('project.notesLabel')} value={notes} onChange={e => setNotes(e.target.value)} />
              <select className={styles.statusSelect} value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}>
                <option value="active">{t('project.status.active')}</option>
                <option value="done">{t('project.status.done')}</option>
                <option value="dropped">{t('project.status.dropped')}</option>
              </select>
              <div className={styles.actions}>
                <Button variant="secondary" size="sm" onClick={handleDelete} disabled={deletingIds.has(project.id)}>{t('project.delete')}</Button>
                <Button size="sm" onClick={handleSave}>{t('project.save')}</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`${t('project.linkedSchedules')} (${sorted.length})`} />
          <CardBody>
            {sorted.length === 0 && <p className={styles.empty}>{t('project.noLinkedSchedules')}</p>}
            <ul className={styles.list}>
              {sorted.map(s => (
                <li key={s.id} className={styles.scheduleRow}>
                  <span className={styles.schedDate}>{dayjs(s.date).format('M.D')}</span>
                  <span className={styles.schedText}>{s.wardName ?? s.customTitle ?? s.type} · {s.startTime}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
