import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, UserCircle, Languages, HelpCircle } from 'lucide-react'
import { useAtom, useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Badge, Avatar, SegmentedControl, ResponsiveDialog } from '@/components/ui'
import { signOut } from '@/services/authService'
import { authUserAtom } from '@/store/authAtom'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { SCOPE_ALL } from '@/utils/scope'
import { LANGUAGES, type SupportedLang } from '@/i18n'
import { RemindersBell } from '@/components/domain/Reminders/RemindersBell'
import { ROUTES } from '@/router/routes'
import styles from './TopBar.module.scss'

interface TopBarProps {
  name: string
  subtext?: string
  pendingCount?: number
  helpInfoKey?: string
}

export function TopBar({ name, subtext, pendingCount = 0, helpInfoKey }: TopBarProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const user = useAtomValue(authUserAtom)
  const [viewSeventyUid, setViewSeventyUid] = useAtom(seventyViewAtom)

  // '내 담당' 쪽이 실제로 좁혀진 스코프로 해석될 때만 스위치를 노출한다.
  // admin+exec_secretary인데 담당 칠십인이 없으면 어느 쪽을 골라도 전체라서 스위치가 거짓말이 된다.
  const canScopeToOwn =
    user?.role === 'admin' &&
    (user.secondaryRole === 'seventy' ||
      (user.secondaryRole === 'exec_secretary' && !!user.assignedSeventyUid))
  const isShowingAll = viewSeventyUid === SCOPE_ALL

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
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
        {canScopeToOwn && (
          <SegmentedControl
            options={[
              { value: 'mine', label: t('scope.myAssigned') },
              { value: 'all', label: t('scope.all') },
            ]}
            value={isShowingAll ? 'all' : 'mine'}
            onChange={(next) => setViewSeventyUid(next === 'all' ? SCOPE_ALL : null)}
            aria-label={t('scope.label')}
            className={styles.scopeSwitch}
          />
        )}
        {pendingCount > 0 && (
          <Badge variant="warning">{t('task.pendingCount', { count: pendingCount })}</Badge>
        )}
        <RemindersBell />
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
            onClick={() => setOpen((v) => !v)}
            aria-label={t('auth.accountMenu')}
          >
            <Avatar name={name} size="sm" />
          </button>
          {open && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                <span className={styles.dropdownName}>{name}</span>
              </div>
              <Link
                to={ROUTES.settingsAccount}
                className={styles.dropdownItem}
                onClick={() => setOpen(false)}
              >
                <UserCircle size={14} />
                {t('nav.account')}
              </Link>
              <div className={styles.dropdownDivider} />
              <div className={styles.dropdownLangRow}>
                <Languages size={14} className={styles.dropdownLangIcon} />
                <div className={styles.dropdownLangBtns}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={clsx(
                        styles.langBtn,
                        i18n.language === lang.code && styles.langBtnActive,
                      )}
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
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
              >
                <LogOut size={14} />
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
      {helpInfoKey && (
        <ResponsiveDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={t(`${helpInfoKey}.title`)}
        >
          <p className={styles.helpBody}>{t(`${helpInfoKey}.body`)}</p>
        </ResponsiveDialog>
      )}
    </header>
  )
}
