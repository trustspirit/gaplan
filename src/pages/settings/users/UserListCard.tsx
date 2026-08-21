import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { deleteUserAccount, deletePreRegisteredUser } from '@/services/userService'
import { useUsers } from '@/hooks/useUsers'
import { ROLE_LABELS } from '@/constants/roles'
import { Card, CardHeader, CardBody, Button, Badge, Avatar, Skeleton, Modal } from '@/components/ui'
import type { AppUser } from '@/types'
import { EditUserModal } from './EditUserModal'
import styles from './users.module.scss'

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
      toast.success(
        deleteAction ? t('user.preRegDeleteSuccess', { name: user.name }) : t('user.deleteSuccess'),
      )
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
        <strong>{user.name}</strong> ({user.email}) {confirmText ?? t('user.deleteConfirm')}
        <br />
        {warningText ?? t('user.deleteWarning')}
      </p>
      <div className={styles.modalActions}>
        <Button variant="ghost" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" loading={loading} onClick={handleDelete}>
          {t('common.delete')}
        </Button>
      </div>
    </Modal>
  )
}

export function UserListCard() {
  const { t } = useTranslation()
  const currentUser = useAtomValue(authUserAtom)!
  const { users, loading: usersLoading } = useUsers()

  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null)
  const [deletingPreReg, setDeletingPreReg] = useState<AppUser | null>(null)

  return (
    <>
      <Card>
        <CardHeader title={t('settings.system.usersTitle')} />
        <CardBody>
          {usersLoading
            ? [1, 2, 3].map((i) => (
                <Skeleton key={i} height="44px" className={styles.skeletonRow} />
              ))
            : users.map((u) => (
                <div key={u.uid} className={styles.userRow}>
                  <Avatar name={u.name} size="sm" />
                  <div className={styles.userInfo}>
                    <p className={styles.userName}>
                      {u.name}
                      {!u.preRegistered && (
                        <CheckCircle2 size={13} className={styles.verifiedIcon} />
                      )}
                    </p>
                    <p className={styles.userEmail}>{u.email || '—'}</p>
                  </div>
                  <Badge
                    variant={
                      u.role === 'admin' ? 'danger' : u.role === 'seventy' ? 'warning' : 'default'
                    }
                  >
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
                        onClick={() =>
                          u.preRegistered ? setDeletingPreReg(u) : setDeletingUser(u)
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
        </CardBody>
      </Card>

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
    </>
  )
}
