import { useState, useRef, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { useLeaders } from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'
import { authUserAtom } from '@/store/authAtom'
import { AppShell, TopBar } from '@/components/layout'
import { Skeleton } from '@/components/ui'
import styles from './LeadersPage.module.scss'

const PAGE_SIZE = 20

export function LeadersPage() {
  const { t } = useTranslation()
  const currentUser = useAtomValue(authUserAtom)!
  const { leaders, loading } = useLeaders()
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query])

  const filtered = useMemo(() => {
    const q = query.trim()
    const list = q
      ? leaders.filter(l => l.name.includes(q) || l.unitNameKo.includes(q))
      : leaders
    return [...list].sort((a, b) => a.unitNameKo.localeCompare(b.unitNameKo, 'ko'))
  }, [leaders, query])

  const visible = filtered.slice(0, visibleCount)

  const groups = useMemo(() => {
    const result: { unitName: string; leaders: Leader[] }[] = []
    for (const leader of visible) {
      const last = result[result.length - 1]
      if (last?.unitName === leader.unitNameKo) {
        last.leaders.push(leader)
      } else {
        result.push({ unitName: leader.unitNameKo, leaders: [leader] })
      }
    }
    return result
  }, [visible])

  // Always update ref with latest filtered.length to avoid stale closure in observer
  const loadMoreRef = useRef<() => void>(() => {})
  loadMoreRef.current = () => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
  }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMoreRef.current()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <AppShell
      role={currentUser.role}
      name={currentUser.name}
      topBar={<TopBar name={currentUser.name} subtext={t('nav.leaders')} />}
    >
      <div className={styles.page}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="search"
            placeholder={t('leaders.searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.list}>
          {loading ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} height="64px" className={styles.skeletonItem} />
            ))
          ) : groups.length === 0 ? (
            <p className={styles.empty}>{t('leaders.empty')}</p>
          ) : (
            groups.map(group => (
              <div key={group.unitName} className={styles.group}>
                <h3 className={styles.groupHeader}>{group.unitName}</h3>
                {group.leaders.map(leader => (
                  <div key={leader.id} className={styles.card}>
                    <div className={styles.cardInfo}>
                      <span className={styles.roleBadge}>{leader.role}</span>
                      <span className={styles.cardName}>{leader.name}</span>
                    </div>
                    {(leader.phone || leader.email) && (
                      <div className={styles.cardContacts}>
                        {leader.phone && (
                          <a
                            href={`tel:${leader.phone}`}
                            className={styles.contactLink}
                            aria-label={`${leader.name} 전화`}
                          >
                            {leader.phone}
                          </a>
                        )}
                        {leader.email && (
                          <a
                            href={`mailto:${leader.email}`}
                            className={styles.contactLink}
                            aria-label={`${leader.name} 이메일`}
                          >
                            {leader.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div ref={sentinelRef} className={styles.sentinel} />
      </div>
    </AppShell>
  )
}
