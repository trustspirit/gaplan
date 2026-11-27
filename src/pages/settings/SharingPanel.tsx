import { useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { db } from '@/firebase'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import {
  setGlobalPublic,
  setScopePublic,
  setSeventyPublic,
  type PublicScopeState,
} from '@/services/publicLinkService'
import { seventyScopeId } from '@/utils/publicScope'
import { buildSeventyLinkRows, type SeventyLinkRow } from './seventyLinkRows'
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
  ErrorState,
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
  // 읽지 못했으면 스위치를 잠가 둔다 — "전부 꺼짐"으로 보이는 화면에서 켜면 이미 나눠 준
  // 링크의 토큰 자리에 새 토큰을 써 버린다.
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [schedulePublic, setSchedulePublic] = useState(false)
  const [globalToken, setGlobalToken] = useState('')
  // 전체 링크 토큰이 칠십인 개인 링크로 옮겨 갔으면 그 범위 값(`seventy:<uid>`).
  const [globalMovedTo, setGlobalMovedTo] = useState('')
  const viewer = useAtomValue(authUserAtom)
  const { users } = useUsers()
  const [unitStates, setUnitStates] = useState<Record<string, PublicScopeState>>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [copiedScope, setCopiedScope] = useState<string | null>(null)
  // 지역 접기(스펙 §4.3). 기본은 전부 접힘 — 검색어나 「활성만」으로 목록이 이미
  // 좁혀졌을 때는 접어 둘 이유가 없으므로 그때는 이 상태와 무관하게 강제로 펼친다.
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  useEffect(() => {
    setFetching(true)
    Promise.all([getDoc(doc(db, 'settings', 'public')), getDoc(doc(db, 'settings', 'publicUnits'))])
      .then(([pubSnap, unitsSnap]) => {
        setLoadFailed(false)
        const pubData = pubSnap.data() as
          | { schedulePublic?: boolean; globalToken?: string; globalTokenMovedTo?: string }
          | undefined
        setSchedulePublic(pubData?.schedulePublic === true)
        setGlobalToken(pubData?.globalToken ?? '')
        setGlobalMovedTo(pubData?.globalTokenMovedTo ?? '')
        setUnitStates((unitsSnap.data() as Record<string, PublicScopeState>) ?? {})
      })
      // 읽기가 실패하면 여기 안 걸면 "전부 꺼짐"으로 조용히 렌더된다 — 뭔가
      // 잘못됐다는 표시가 전혀 없다.
      .catch(() => {
        setLoadFailed(true)
        toast.error(t('common.loadFailed'))
      })
      .finally(() => setFetching(false))
  }, [t, reloadKey])

  const groups = useMemo(() => buildSharingGroups(unitStates), [unitStates])
  const seventyRows = useMemo(
    () => (viewer ? buildSeventyLinkRows(viewer, users, unitStates) : []),
    [viewer, users, unitStates],
  )
  const movedToName = globalMovedTo
    ? (users.find((u) => seventyScopeId(u.uid) === globalMovedTo)?.name ?? globalMovedTo)
    : ''
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
      const token = await setGlobalPublic(next, globalToken || null, globalMovedTo || null)
      setSchedulePublic(next)
      setGlobalToken(token ?? '')
    } catch {
      toast.error(t('common.saveFailed'))
    }
  }

  const handleSeventyToggle = async (row: SeventyLinkRow, next: boolean) => {
    try {
      const { token, tookOverGlobal } = await setSeventyPublic(
        row.uid,
        next,
        row.token || null,
        globalToken || null,
      )
      setUnitStates((prev) => ({ ...prev, [row.scopeId]: { enabled: next, token: token ?? '' } }))
      if (tookOverGlobal) {
        setGlobalToken('')
        setGlobalMovedTo(row.scopeId)
      }
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
      {loadFailed && <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />}
      <Card>
        <CardHeader title={t('settings.sharing.globalTitle')} />
        <CardBody>
          <p className={styles.desc}>{t('settings.sharing.globalDesc')}</p>
          <div className={styles.globalRow} data-testid="global-toggle">
            <Switch
              checked={schedulePublic}
              onChange={handleGlobalToggle}
              aria-label={t('settings.sharing.globalTitle')}
              disabled={fetching || loadFailed}
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
          {globalMovedTo && (
            <p className={styles.desc}>{t('settings.sharing.globalMovedTo', { name: movedToName })}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('settings.sharing.seventyTitle')} />
        <CardBody>
          <p className={styles.desc}>{t('settings.sharing.seventyDesc')}</p>
          {seventyRows.length === 0 ? (
            <p className={styles.noMatch}>{t('settings.sharing.seventyEmpty')}</p>
          ) : (
            seventyRows.map((row) => (
              <div
                key={row.scopeId}
                data-seventy-row
                className={clsx(styles.row, row.enabled && styles.rowActive)}
              >
                <span className={styles.rowName}>{row.name}</span>
                <Switch
                  checked={row.enabled}
                  onChange={(next) => handleSeventyToggle(row, next)}
                  aria-label={row.name}
                  disabled={fetching || loadFailed}
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
            ))
          )}
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
                    disabled={fetching || loadFailed}
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
