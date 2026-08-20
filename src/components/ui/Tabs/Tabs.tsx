import { Fragment, useCallback, type KeyboardEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Tabs.module.scss'

export interface TabItem {
  id: string
  label: string
  count?: number
  href?: string
}

/**
 * renderLink에 넘기는 프롭 백. 개별 인자로 쪼개지 않는 이유 — 예전 시그니처는
 * 호출자가 role, aria-selected, tabIndex를 직접 붙이게 했고 여기에 onKeyDown까지
 * 늘어난다. 한 컴포넌트의 ARIA를 틀릴 기회가 네 번 생기는 셈이라,
 * `<NavLink {...props}>` 한 번으로 전부 전달되도록 백으로 묶는다.
 */
export interface TabLinkProps {
  className: string
  role: 'tab'
  'aria-selected': boolean
  tabIndex: 0 | -1
  onKeyDown: (e: KeyboardEvent) => void
}

interface TabsProps {
  items: TabItem[]
  activeId: string
  onSelect?: (id: string) => void
  renderLink?: (item: TabItem, children: ReactNode, props: TabLinkProps) => ReactNode
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
  // WAI-ARIA APG: 로빙 tabindex의 나머지 절반. 화살표로 좌우 이동(양쪽 랩어라운드),
  // Home/End로 처음/끝. 수동 활성화 탭리스트이므로 포커스만 옮기고 선택은 건드리지 않는다
  // (선택은 클릭과 Enter/Space가 네이티브 button에서 이미 처리한다).
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
      return
    }
    // button 경로와 renderLink 경로를 한 코드로 다루기 위해 DOM에서 탭을 찾는다.
    // ref 대신 이벤트 타깃에서 탭리스트를 거슬러 올라간다 — renderLink는 렌더 중에
    // 호출되므로 프롭 백이 ref.current를 읽으면 렌더 중 ref 접근이 된다.
    const target = e.currentTarget as HTMLElement
    const tabs = Array.from(
      target.closest('[role="tablist"]')?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [],
    )
    if (tabs.length === 0) return

    const current = tabs.indexOf(target)
    let next: number
    switch (e.key) {
      case 'ArrowLeft':
        next = current <= 0 ? tabs.length - 1 : current - 1
        break
      case 'ArrowRight':
        next = current === tabs.length - 1 ? 0 : current + 1
        break
      case 'Home':
        next = 0
        break
      default:
        next = tabs.length - 1
    }

    e.preventDefault()
    tabs[next]?.focus()
  }, [])

  // activeId가 아무 항목과도 맞지 않으면 모든 탭이 tabIndex=-1이 되어 탭리스트
  // 전체가 키보드로 도달 불가능해진다. 그 경우에는 첫 탭을 탭 순서에 남긴다.
  const hasActiveItem = items.some((item) => item.id === activeId)

  return (
    <div className={clsx(styles.list, className)} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const active = item.id === activeId
        const cls = clsx(styles.tab, active && styles.active)
        const tabIndex: 0 | -1 = (hasActiveItem ? active : index === 0) ? 0 : -1
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
          const linkProps: TabLinkProps = {
            className: cls,
            role: 'tab',
            'aria-selected': active,
            tabIndex,
            onKeyDown: handleKeyDown,
          }
          return <Fragment key={item.id}>{renderLink(item, content, linkProps)}</Fragment>
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            // 화살표 키로 탭을 옮기는 관례에 맞춰 활성 탭만 탭 순서에 둔다
            tabIndex={tabIndex}
            className={cls}
            onClick={() => onSelect?.(item.id)}
            onKeyDown={handleKeyDown}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
