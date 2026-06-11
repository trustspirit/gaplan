import { useState, useEffect, useRef } from 'react'
import { LogOut, Pencil, Languages, HelpCircle, Globe, User } from 'lucide-react'
import { useAtom, useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Badge, Avatar, Modal, BottomSheet } from '@/components/ui'
import { signOut } from '@/services/authService'
import { updateUserName } from '@/services/userService'
import { authUserAtom } from '@/store/authAtom'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { SCOPE_ALL } from '@/utils/scope'
import { LANGUAGES, type SupportedLang } from '@/i18n'
import { useIsMobile } from '@/hooks/useIsMobile'
import styles from './TopBar.module.scss'

interface TopBarProps { name: string; subtext?: string; pendingCount?: number; helpInfoKey?: string }

function EditNameRow({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useAtom(authUserAtom)
  const { t } = useTranslation()
  const [value, setValue] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user || !value.trim()) return
    setSaving(true)
    try {
      await updateUserName(user.uid, value.trim())
      setUser({ ...user, name: value.trim() })
      toast.success(t('auth.nameSaved'))
      onDone()
    } catch {
      toast.error(t('auth.nameSaveFailed'))
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
        {saving ? '…' : t('common.save')}
      </button>
    </div>
  )
}

export function TopBar({ name, subtext, pendingCount = 0, helpInfoKey }: TopBarProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const isMobile = useIsMobile()
  const ref = useRef<HTMLDivElement>(null)
  const user = useAtomValue(authUserAtom)
  const [viewSeventyUid, setViewSeventyUid] = useAtom(seventyViewAtom)

  const isAdminExecSec = user?.role === 'admin' && (user.secondaryRole === 'exec_secretary' || user.secondaryRole === 'seventy')
  const isShowingAll = viewSeventyUid === SCOPE_ALL || (!viewSeventyUid && !user?.secondaryRole)

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
        <p className={styles.greeting}>{t('auth.greeting', { name })}</p>
        {subtext && <p className={styles.sub}>{subtext}</p>}
      </div>
      <div className={styles.right}>
        {isAdminExecSec && (
          <button
            type="button"
            className={clsx(styles.scopeToggle, isShowingAll && styles.scopeToggleAll)}
            onClick={() => setViewSeventyUid(isShowingAll ? null : SCOPE_ALL)}
            title={isShowingAll ? t('scope.myAssigned') : t('scope.showAll')}
          >
            {isShowingAll ? <Globe size={14} /> : <User size={14} />}
            <span>{isShowingAll ? t('scope.showAll') : t('scope.myAssigned')}</span>
          </button>
        )}
        {pendingCount > 0 && (
          <Badge variant="warning">{t('task.pendingCount', { count: pendingCount })}</Badge>
        )}
        {helpInfoKey && (
          <button
            type="button"
            className={styles.helpBtn}
            onClick={() => setHelpOpen(true)}
            aria-label={t('common.helpButton')}
            title={t('common.helpButton')}
          >
            <HelpCircle size={18} />
          </button>
        )}
        <div className={styles.avatarWrap} ref={ref}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => { setOpen(v => !v); setEditingName(false) }}
            aria-label={t('auth.accountMenu')}
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
                <button type="button" className={styles.dropdownItem} onClick={() => setEditingName(true)}>
                  <Pencil size={14} />
                  {t('auth.changeName')}
                </button>
              )}
              <div className={styles.dropdownDivider} />
              <div className={styles.dropdownLangRow}>
                <Languages size={14} className={styles.dropdownLangIcon} />
                <div className={styles.dropdownLangBtns}>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      className={clsx(styles.langBtn, i18n.language === lang.code && styles.langBtnActive)}
                      onClick={() => i18n.changeLanguage(lang.code as SupportedLang)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => { setOpen(false); signOut() }}
              >
                <LogOut size={14} />
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
      {helpInfoKey && helpOpen && (
        isMobile ? (
          <BottomSheet open={helpOpen} onClose={() => setHelpOpen(false)} title={t(`${helpInfoKey}.title`)}>
            <p className={styles.helpBody}>{t(`${helpInfoKey}.body`)}</p>
          </BottomSheet>
        ) : (
          <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t(`${helpInfoKey}.title`)}>
            <p className={styles.helpBody}>{t(`${helpInfoKey}.body`)}</p>
          </Modal>
        )
      )}
    </header>
  )
}
