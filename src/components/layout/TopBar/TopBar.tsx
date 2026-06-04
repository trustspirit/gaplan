import { useState, useEffect, useRef } from 'react'
import { LogOut, Pencil } from 'lucide-react'
import { useAtom } from 'jotai'
import { toast } from 'sonner'
import { Badge, Avatar } from '@/components/ui'
import { signOut } from '@/services/authService'
import { updateUserName } from '@/services/userService'
import { authUserAtom } from '@/store/authAtom'
import styles from './TopBar.module.scss'

interface TopBarProps { name: string; subtext?: string; pendingCount?: number }

function EditNameRow({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useAtom(authUserAtom)
  const [value, setValue] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user || !value.trim()) return
    setSaving(true)
    try {
      await updateUserName(user.uid, value.trim())
      setUser({ ...user, name: value.trim() })
      toast.success('이름이 변경되었습니다.')
      onDone()
    } catch {
      toast.error('이름 변경에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.editNameRow}>
      <input
        className={styles.editNameInput}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        autoFocus
        maxLength={30}
      />
      <button type="button" className={styles.editNameSave} onClick={handleSave} disabled={saving}>
        {saving ? '…' : '저장'}
      </button>
    </div>
  )
}

export function TopBar({ name, subtext, pendingCount = 0 }: TopBarProps) {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setEditingName(false) }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <header className={styles.topbar}>
      <div className={styles.textGroup}>
        <p className={styles.greeting}>{name}님, 안녕하세요</p>
        {subtext && <p className={styles.sub}>{subtext}</p>}
      </div>
      <div className={styles.right}>
        {pendingCount > 0 && (
          <Badge variant="warning">처리 필요 {pendingCount}건</Badge>
        )}
        <div className={styles.avatarWrap} ref={ref}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => { setOpen(v => !v); setEditingName(false) }}
            aria-label="계정 메뉴"
          >
            <Avatar name={name} size="sm" />
          </button>
          {open && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                <span className={styles.dropdownName}>{name}</span>
              </div>
              {editingName ? (
                <EditNameRow onDone={() => { setEditingName(false); setOpen(false) }} />
              ) : (
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => setEditingName(true)}
                >
                  <Pencil size={14} />
                  이름 변경
                </button>
              )}
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => { setOpen(false); signOut() }}
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
