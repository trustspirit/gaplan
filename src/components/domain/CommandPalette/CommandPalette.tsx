import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Search } from 'lucide-react'
import type { UserRole } from '@/types'
import { navItemsFor } from '@/components/layout/navItems'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { filterCommandItems, type CommandItem } from './commandPaletteItems'
import styles from './CommandPalette.module.scss'

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  role: UserRole
}

/**
 * ⌘K로 여는 빠른 이동.
 *
 * 항목의 출처는 navItemsFor(role) 하나다 — 역할별 필터링이 이미 거기 있으므로 여기서
 * 권한을 다시 판단하지 않는다. 두 곳에서 판단하면 사이드바엔 없는 페이지가 팔레트엔
 * 뜨는 날이 온다.
 *
 * 일정은 검색하지 않는다. 그러려면 팔레트가 전역에서 일정을 구독해야 하는데, 가끔 쓰는
 * 기능 때문에 모든 페이지가 Firestore 읽기를 늘 물고 있게 된다.
 */
export function CommandPalette({ open, onClose, role }: CommandPaletteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: CommandItem[] = useMemo(
    () => navItemsFor(role).map((item) => ({ id: item.id, label: t(item.labelKey), to: item.to })),
    [role, t],
  )
  const results = useMemo(() => filterCommandItems(items, query), [items, query])

  useFocusTrap(sheetRef, open, onClose)

  // 열 때마다 질의를 비운다 — 지난번에 치던 글자가 남아 있으면 첫 타이핑이
  // 엉뚱한 목록 위에서 시작한다.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    inputRef.current?.focus()
  }, [open])

  // 목록이 줄어들면 선택이 목록 밖으로 나갈 수 있다.
  useEffect(() => {
    setActiveIndex((i) => (i >= results.length ? 0 : i))
  }, [results.length])

  if (!open) return null

  const go = (item: CommandItem) => {
    onClose()
    if (item.run) item.run()
    else if (item.to) navigate(item.to)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // 목록이 비면 아무것도 하지 않는다 — 마지막으로 고른 것으로 튀면 안 된다.
      const item = results[activeIndex]
      if (item) go(item)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPalette.label')}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.inputRow}>
          <Search size={16} className={styles.inputIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            aria-label={t('commandPalette.placeholder')}
            // 결과 목록을 직접 그리므로 브라우저 자동완성이 겹치면 방해만 된다.
            autoComplete="off"
          />
        </div>

        {results.length === 0 ? (
          <p className={styles.empty}>{t('commandPalette.empty')}</p>
        ) : (
          <ul className={styles.list} role="listbox" aria-label={t('commandPalette.label')}>
            {results.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={clsx(styles.item, index === activeIndex && styles.itemActive)}
                  // 마우스로 훑을 때도 키보드 선택과 같은 곳이 강조돼야 한다.
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.hint}>{t('commandPalette.hint')}</p>
      </div>
    </div>,
    document.body,
  )
}
