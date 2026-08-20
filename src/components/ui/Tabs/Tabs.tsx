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
  renderLink?: (item: TabItem, children: ReactNode, className: string, active: boolean) => ReactNode
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
        // 뱃지 앞에 명시적인 공백 텍스트 노드를 둔다 — 실제 브라우저에서도 .count는
        // display를 지정하지 않아 인라인으로 계산되고, accname 스펙의 구분자 규칙은
        // 인라인 요소 사이에는 적용되지 않는다. 이 공백이 없으면 접근성 이름이
        // 프로덕션 크롬/파이어폭스에서도 "Task3"으로 합쳐진다 — jsdom에만 있는
        // 문제가 아니라 실제 환경 전반에 필요한 고정 텍스트 노드다.
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
          return <Fragment key={item.id}>{renderLink(item, content, cls, active)}</Fragment>
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
