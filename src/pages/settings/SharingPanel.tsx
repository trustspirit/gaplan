import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { db } from '@/firebase'
import {
  setGlobalPublic,
  setScopePublic,
  type PublicScopeState,
} from '@/services/publicLinkService'
import {
  buildSharingGroups,
  filterSharingGroups,
  countActive,
  type SharingRow,
} from './sharingRows'
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Switch,
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui'
import styles from './SharingPanel.module.scss'

type Filter = 'all' | 'active'

/**
 * 공유 화면. 전체 공개 킬스위치 하나와, 그 아래 지역·단위별 공개 링크 목록을
 * 검색·필터로 좁혀 보는 목록으로 이루어진다.
 *
 * 최초 1회 getDoc으로 읽는다 — 실시간 구독이 아니다.
 */
export function SharingPanel() {
  const { t } = useTranslation()
  const [fetching, setFetching] = useState(true)
  const [schedulePublic, setSchedulePublic] = useState(false)
  const [globalToken, setGlobalToken] = useState('')
  const [unitStates, setUnitStates] = useState<Record<string, PublicScopeState>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [copiedScope, setCopiedScope] = useState<string | null>(null)
  // 지역 접기(스펙 §4.3). 기본은 전부 접힘 — 검색어나 「활성만」으로 목록이 이미
  // 좁혀졌을 때는 접어 둘 이유가 없으므로 그때는 이 상태와 무관하게 강제로 펼친다.
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([getDoc(doc(db, 'settings', 'public')), getDoc(doc(db, 'settings', 'publicUnits'))])
      .then(([pubSnap, unitsSnap]) => {
        const pubData = pubSnap.data() as
          | { schedulePublic?: boolean; globalToken?: string }
          | undefined
        setSchedulePublic(pubData?.schedulePublic === true)
        setGlobalToken(pubData?.globalToken ?? '')
        setUnitStates((unitsSnap.data() as Record<string, PublicScopeState>) ?? {})
      })
      // 읽기가 실패하면 여기 안 걸면 "전부 꺼짐"으로 조용히 렌더된다 — 뭔가
      // 잘못됐다는 표시가 전혀 없다.
      .catch(() => toast.error(t('common.loadFailed')))
      .finally(() => setFetching(false))
  }, [t])

  const groups = useMemo(() => buildSharingGroups(unitStates), [unitStates])
  const filteredGroups = useMemo(
    () => filterSharingGroups(groups, query, filter === 'active'),
    [groups, query, filter],
  )
  const activeSummary = countActive(groups)
  // 검색어나 「활성만」이 이미 목록을 좁혀 놓았으면 접어 둔 지역도 강제로 편다 —
  // 안 그러면 검색 결과가 접힌 지역 안에 숨어 "찾았는데 안 보인다"가 된다.
  const isNarrowing = query.trim() !== '' || filter === 'active'
  const isRegionExpanded = (regionId: string) => isNarrowing || expandedRegions.has(regionId)
  const toggleRegion = (regionId: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(regionId)) next.delete(regionId)
      else next.add(regionId)
      return next
    })
  }

  const filterOptions: SegmentOption<Filter>[] = [
    { value: 'all', label: t('settings.sharing.filterAll') },
    { value: 'active', label: t('settings.sharing.filterActive') },
  ]

  const linkFor = (token: string) => `${window.location.origin}/public/schedule/${token}`

  const handleCopy = (scopeId: string, token: string) => {
    navigator.clipboard
      .writeText(linkFor(token))
      .then(() => {
        setCopiedScope(scopeId)
        toast.success(t('settings.sharing.copied'))
        setTimeout(() => setCopiedScope((current) => (current === scopeId ? null : current)), 2000)
      })
      .catch(() => toast.error(t('common.saveFailed')))
  }

  const handleGlobalToggle = async (next: boolean) => {
    try {
      const token = await setGlobalPublic(next, globalToken || null)
      setSchedulePublic(next)
      setGlobalToken(token ?? '')
    } catch {
      toast.error(t('common.saveFailed'))
    }
  }

  const handleScopeToggle = async (row: SharingRow, next: boolean) => {
    try {
      const token = await setScopePublic(row.scopeId, next, row.token || null)
      setUnitStates((prev) => ({ ...prev, [row.scopeId]: { enabled: next, token: token ?? '' } }))
    } catch {
      toast.error(t('common.saveFailed'))
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={t('settings.sharing.globalTitle')} />
        <CardBody>
          <p className={styles.desc}>{t('settings.sharing.globalDesc')}</p>
          <div className={styles.globalRow} data-testid="global-toggle">
            <Switch
              checked={schedulePublic}
              onChange={handleGlobalToggle}
              aria-label={t('settings.sharing.globalTitle')}
              disabled={fetching}
            />
            {schedulePublic && globalToken && (
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopy('__global__', globalToken)}
                title={t('common.copyLink')}
              >
                {copiedScope === '__global__' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('settings.sharing.unitsTitle')} />
        <CardBody>
          {!fetching && !schedulePublic && (
            <p className={styles.warning}>{t('settings.sharing.globalOffWarning')}</p>
          )}

          <div className={styles.controls}>
            <Input
              placeholder={t('settings.sharing.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <SegmentedControl
              options={filterOptions}
              value={filter}
              onChange={setFilter}
              aria-label={t('settings.sharing.unitsTitle')}
            />
          </div>

          <p className={styles.summary} data-testid="sharing-summary">
            {t('settings.sharing.summary', activeSummary)}
          </p>

          {!fetching && filteredGroups.length === 0 ? (
            <p className={styles.noMatch}>{t('settings.sharing.noMatch')}</p>
          ) : (
            filteredGroups.map((group) => {
              const [regionRow, ...unitRows] = group.rows
              const expanded = isRegionExpanded(group.regionId)
              const renderRow = (row: SharingRow) => (
                <div
                  key={row.scopeId}
                  data-scope-row
                  className={clsx(
                    styles.row,
                    row.depth === 1 && styles.rowIndented,
                    row.enabled && styles.rowActive,
                  )}
                >
                  {row.depth === 0 && unitRows.length > 0 && !isNarrowing && (
                    <button
                      type="button"
                      className={styles.collapseBtn}
                      onClick={() => toggleRegion(group.regionId)}
                      aria-expanded={expanded}
                      aria-label={t(
                        expanded ? 'settings.sharing.collapseRegion' : 'settings.sharing.expandRegion',
                        { region: row.nameKo },
                      )}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  <span className={styles.rowName}>{row.nameKo}</span>
                  <Switch
                    checked={row.enabled}
                    onChange={(next) => handleScopeToggle(row, next)}
                    aria-label={row.nameKo}
                    disabled={fetching}
                  />
                  {row.enabled && row.token && (
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(row.scopeId, row.token)}
                      title={t('common.copyLink')}
                    >
                      {copiedScope === row.scopeId ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              )
              return (
                <div key={group.regionId} className={styles.group} data-region={group.regionId}>
                  {renderRow(regionRow)}
                  {expanded && unitRows.map(renderRow)}
                </div>
              )
            })
          )}
        </CardBody>
      </Card>
    </>
  )
}
