import { Fragment, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Tabs.module.scss'

export interface TabItem {
  id: string
  label: string
  count?: number
  href?: string
}

interface TabsProps {
  items: TabItem[]
  activeId: string
  onSelect?: (id: string) => void
  renderLink?: (item: TabItem, children: ReactNode, className: string) => ReactNode
  'aria-label': string
  className?: string
}

export function Tabs({
  items,
  activeId,
  onSelect,
  renderLink,
  'aria-label': ariaLabel,
  className,
}: TabsProps) {
  return (
    <div className={clsx(styles.list, className)} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.id === activeId
        const cls = clsx(styles.tab, active && styles.active)
        // 뱃지 앞에 명시적인 공백 텍스트 노드를 둔다 — jsdom은 인라인 요소 사이에
        // 접근성 이름 구분자를 자동으로 넣지 않으므로, 그렇지 않으면 "Task 3"이
        // "Task3"으로 합쳐진다. 여전히 두 개의 별도 span으로 유지한다.
        const content = (
          <>
            <span>{item.label}</span>
            {item.count !== undefined && (
              <>
                {' '}
                <span className={styles.count}>{item.count}</span>
              </>
            )}
          </>
        )

        // Fragment로 감싼다 — role="tablist"와 role="tab" 사이에 요소가 끼면
        // ARIA 소유 관계가 깨진다 (getByRole은 이걸 검사하지 않는다)
        if (item.href && renderLink) {
          return <Fragment key={item.id}>{renderLink(item, content, cls)}</Fragment>
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            // 화살표 키로 탭을 옮기는 관례에 맞춰 활성 탭만 탭 순서에 둔다
            tabIndex={active ? 0 : -1}
            className={cls}
            onClick={() => onSelect?.(item.id)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
