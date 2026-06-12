import { useState, useRef, useEffect, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { useLeaders } from '@/hooks/useLeaders'
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

  // Reset visible count when search query changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query])

  const filtered = leaders.filter(
    l =>
      l.name.includes(query) ||
      l.unitNameKo.includes(query),
  )

  const visible = filtered.slice(0, visibleCount)

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length))
  }, [filtered.length])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <AppShell
      role={currentUser.role}
      name={currentUser.name}
      topBar={
        <TopBar
          name={currentUser.name}
          subtext={t('nav.leaders')}
        />
      }
    >
      <div className={styles.page}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder={t('leaders.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className={styles.list}>
          {loading ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} height="64px" className={styles.skeletonItem} />
            ))
          ) : visible.length === 0 ? (
            <p className={styles.empty}>{t('leaders.empty')}</p>
          ) : (
            visible.map(leader => (
              <div key={leader.id} className={styles.card}>
                <div className={styles.cardInfo}>
                  <span className={styles.cardName}>{leader.name}</span>
                </div>
                <div className={styles.cardUnit}>
                  <span className={styles.roleBadge}>{leader.role}</span>
                  <span>{leader.unitNameKo}</span>
                </div>
                {(leader.phone || leader.email) && (
                  <div className={styles.cardContacts}>
                    {leader.phone && (
                      <a href={`tel:${leader.phone}`} className={styles.contactLink} aria-label={`${leader.name} 전화`}>
                        {leader.phone}
                      </a>
                    )}
                    {leader.email && (
                      <a href={`mailto:${leader.email}`} className={styles.contactLink} aria-label={`${leader.name} 이메일`}>
                        {leader.email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {!loading && visibleCount < filtered.length && (
          <div ref={sentinelRef} className={styles.sentinel} />
        )}
      </div>
    </AppShell>
  )
}
