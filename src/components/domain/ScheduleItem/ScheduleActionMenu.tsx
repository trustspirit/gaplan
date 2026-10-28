import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BottomSheet } from '@/components/ui'
import styles from './ScheduleItem.module.scss'

interface ScheduleActionMenuProps {
  /** 모바일 시트 제목 — 어떤 일정을 고르고 있는지 말해 준다. */
  title: string
  onEdit?: () => void
  /** 지우기 전에 확인을 묻는 건 호출자 몫이다(행은 스와이프로도 같은 확인을 연다). */
  onRequestDelete?: () => void
}

/**
 * 일정 하나의 ⋯ 메뉴(수정·삭제). 데스크톱은 버튼 아래 팝오버, 모바일은 바텀시트.
 * 목록 행(ScheduleItem)과 홈의 다음 일정 카드(NextUpCard)가 같은 메뉴를 쓴다.
 */
export function ScheduleActionMenu({ title, onEdit, onRequestDelete }: ScheduleActionMenuProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  // lazy-mount flag so closed rows don't each carry a hidden portal
  const [sheetEverOpen, setSheetEverOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen || isMobile) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuOpen, isMobile])

  const pickEdit = () => {
    setMenuOpen(false)
    onEdit?.()
  }
  const pickDelete = () => {
    setMenuOpen(false)
    onRequestDelete?.()
  }

  return (
    <div className={styles.kebabWrapper}>
      <button
        ref={btnRef}
        type="button"
        className={styles.kebabBtn}
        onClick={(e) => {
          e.stopPropagation()
          if (isMobile) {
            setSheetEverOpen(true)
            setMenuOpen((prev) => !prev)
            return
          }
          if (!menuOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect()
            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
          }
          setMenuOpen((prev) => !prev)
        }}
        aria-label={t('common.more')}
      >
        <MoreVertical size={16} />
      </button>
      {!isMobile && menuOpen && menuPos && (
        <>
          <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
          <div className={styles.menu} style={{ top: menuPos.top, right: menuPos.right }}>
            <button type="button" onClick={pickEdit}>
              {t('common.edit')}
            </button>
            {onRequestDelete && (
              <button type="button" className={styles.deleteMenuItem} onClick={pickDelete}>
                {t('common.delete')}
              </button>
            )}
          </div>
        </>
      )}
      {isMobile && (sheetEverOpen || menuOpen) && (
        // mobile: actions in a bottom sheet instead of a scroll-fragile popover
        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={title}>
          <div className={styles.sheetActions}>
            <button type="button" className={styles.sheetActionBtn} onClick={pickEdit}>
              {t('common.edit')}
            </button>
            {onRequestDelete && (
              <button
                type="button"
                className={clsx(styles.sheetActionBtn, styles.sheetActionDanger)}
                onClick={pickDelete}
              >
                {t('common.delete')}
              </button>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
