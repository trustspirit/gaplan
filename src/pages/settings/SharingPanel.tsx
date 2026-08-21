import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Copy, Check } from 'lucide-react'
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
 * CalendarSettings.tsx:41-57과 같은 방식으로 최초 1회 getDoc으로 읽는다 — 실시간
 * 구독이 아니다. 그 화면은 곧 삭제되므로 지금은 로딩 방식이 중복된다.
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
      .finally(() => setFetching(false))
  }, [])

  const groups = useMemo(() => buildSharingGroups(unitStates), [unitStates])
  const filteredGroups = useMemo(
    () => filterSharingGroups(groups, query, filter === 'active'),
    [groups, query, filter],
  )
  const activeSummary = countActive(groups)

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
            filteredGroups.map((group) => (
              <div key={group.regionId} className={styles.group}>
                {group.rows.map((row) => (
                  <div
                    key={row.scopeId}
                    data-scope-row
                    className={clsx(
                      styles.row,
                      row.depth === 1 && styles.rowIndented,
                      row.enabled && styles.rowActive,
                    )}
                  >
                    <span className={styles.rowName}>{row.nameKo}</span>
                    <Switch
                      checked={row.enabled}
                      onChange={(next) => handleScopeToggle(row, next)}
                      aria-label={row.nameKo}
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
                ))}
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </>
  )
}
