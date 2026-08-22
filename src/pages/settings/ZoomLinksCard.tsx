import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { useZoomLinks } from '@/hooks/useZoomLinks'
import type { ZoomLink } from '@/services/userSettingsService'
import { Card, CardHeader, CardBody, DataList, Input, Button, ResponsiveDialog, DeleteConfirmSheet } from '@/components/ui'
import styles from './ZoomLinksCard.module.scss'

/**
 * 저장된 Zoom 링크 관리 카드. 추가·이름 바꾸기·삭제를 모두 여기서 한다 — 일정
 * 폼(ZoomLinkPicker)에도 같은 add()로 저장하는 별도의 진입점이 있지만, 설정에
 * 들어온 사용자가 여기서 아무것도 못 하고 막다른 골목에 몰려서는 안 된다.
 */
export function ZoomLinksCard() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)
  const { links, add, rename, remove } = useZoomLinks(user?.uid)

  const [adding, setAdding] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [renaming, setRenaming] = useState<ZoomLink | null>(null)
  const [renameLabel, setRenameLabel] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [deleting, setDeleting] = useState<ZoomLink | null>(null)

  const openAdd = () => {
    setAddLabel('')
    setAddUrl('')
    setAdding(true)
  }
  const closeAdd = () => setAdding(false)

  const confirmAdd = async () => {
    setAddSaving(true)
    try {
      const result = await add({ label: addLabel, url: addUrl })
      if (result.ok) {
        toast.success(t('settings.account.zoomLinkAdded'))
        setAdding(false)
      } else {
        toast.error(t(`schedule.zoomLinkError.${result.reason}`))
      }
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setAddSaving(false)
    }
  }

  const openRename = (link: ZoomLink) => {
    setRenaming(link)
    setRenameLabel(link.label)
  }
  const closeRename = () => setRenaming(null)

  const confirmRename = async () => {
    if (!renaming) return
    setRenameSaving(true)
    try {
      const result = await rename(renaming.id, renameLabel)
      if (result.ok) {
        toast.success(t('settings.account.zoomLinkRenamed'))
        setRenaming(null)
      } else {
        toast.error(t(`schedule.zoomLinkError.${result.reason}`))
      }
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setRenameSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove(deleting.id)
      toast.success(t('settings.account.zoomLinkDeleted'))
      setDeleting(null)
    } catch {
      toast.error(t('common.deleteFailed'))
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          title={t('settings.account.zoomLinksTitle')}
          action={
            <Button variant="ghost" size="sm" onClick={openAdd}>
              {t('common.add')}
            </Button>
          }
        />
        <CardBody>
          <p className={styles.desc}>{t('settings.account.zoomLinksDesc')}</p>
          {links.length === 0 ? (
            <div className={styles.empty}>
              <p>{t('settings.account.zoomLinksEmpty')}</p>
              <Button variant="secondary" size="sm" onClick={openAdd}>
                {t('common.add')}
              </Button>
            </div>
          ) : (
            <DataList
              aria-label={t('settings.account.zoomLinksTitle')}
              rows={links.map((link) => ({
                id: link.id,
                title: link.label,
                subtitle: link.url,
                actions: (
                  <>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                      onClick={() => openRename(link)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      onClick={() => setDeleting(link)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ),
              }))}
            />
          )}
        </CardBody>
      </Card>

      <ResponsiveDialog open={adding} onClose={closeAdd} title={t('settings.account.zoomLinkAddTitle')}>
        <Input
          label={t('settings.account.zoomLinkLabelField')}
          value={addLabel}
          onChange={(e) => setAddLabel(e.target.value)}
        />
        <Input
          label={t('settings.account.zoomLinkUrlField')}
          value={addUrl}
          onChange={(e) => setAddUrl(e.target.value)}
        />
        <div className={styles.dialogActions}>
          <Button variant="ghost" onClick={closeAdd} disabled={addSaving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirmAdd} loading={addSaving}>
            {t('common.save')}
          </Button>
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={renaming !== null}
        onClose={closeRename}
        title={t('settings.account.zoomLinkRenameTitle')}
      >
        <Input
          label={t('settings.account.zoomLinkLabelField')}
          value={renameLabel}
          onChange={(e) => setRenameLabel(e.target.value)}
        />
        <div className={styles.dialogActions}>
          <Button variant="ghost" onClick={closeRename} disabled={renameSaving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirmRename} loading={renameSaving}>
            {t('common.save')}
          </Button>
        </div>
      </ResponsiveDialog>

      <DeleteConfirmSheet
        open={deleting !== null}
        description={deleting?.label}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
