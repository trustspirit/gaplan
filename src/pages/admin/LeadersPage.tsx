import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { Pencil, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { isSuperAdmin } from '@/utils/permissions'
import { useLeaders } from '@/hooks/useLeaders'
import type { Leader } from '@/types/leader'
import { useTopBar } from '@/hooks/useTopBar'
import { Skeleton } from '@/components/ui'
import { ALL_UNITS, WARDS } from '@/constants/regions'
import { LeaderEditSheet } from '@/components/domain'
import { updateLeader, type LeaderPatch } from '@/services/leaderService'
import styles from './LeadersPage.module.scss'

const WARD_TO_UNIT_ID = new Map(WARDS.map((w) => [w.name.ko, w.unitId]))
const UNIT_ID_TO_NAME = new Map(ALL_UNITS.map((u) => [u.id, u.name]))
const WARD_KO_TO_NAME = new Map(WARDS.map((w) => [w.name.ko, w.name]))

interface BilingualName {
  ko: string
  en: string
}
interface WardGroup {
  wardName: BilingualName
  leaders: Leader[]
}
interface StakeGroup {
  stakeName: BilingualName
  stakeLeaders: Leader[]
  wardGroups: WardGroup[]
}

function LeaderCard({
  leader,
  canEdit,
  onEdit,
}: {
  leader: Leader
  canEdit: boolean
  onEdit: () => void
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
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
      {canEdit && (
        <button
          type="button"
          className={styles.editButton}
          onClick={onEdit}
          aria-label={`${leader.name} 정보 수정`}
        >
          <Pencil size={16} />
        </button>
      )}
    </div>
  )
}

export function LeadersPage() {
  const { t, i18n } = useTranslation()
  const user = useAtomValue(authUserAtom)
  // firestore.rules의 `match /leaders`는 write를 admin으로만 연다. 버튼을 그대로
  // 두면 칠십인에게 누르면 규칙 계층에서 거부되는 버튼이 생긴다(판정 R44).
  const canEdit = isSuperAdmin(user)
  useTopBar({ subtext: t('nav.leaders') })
  const lang = i18n.language === 'en' ? 'en' : 'ko'
  const { leaders, loading } = useLeaders()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Leader | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? leaders.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.unitNameKo.toLowerCase().includes(q) ||
            l.unitNameEn.toLowerCase().includes(q),
        )
      : leaders
  }, [leaders, query])

  const groups = useMemo((): StakeGroup[] => {
    type RawGroup = { stakeLeaders: Leader[]; wardLeaders: Map<string, Leader[]> }
    const stakeMap = new Map<string, RawGroup>()

    for (const leader of filtered) {
      const isStakeLevel = leader.role === '스테이크 회장' || leader.role === '지방부 회장'
      if (isStakeLevel) {
        let g = stakeMap.get(leader.unitNameKo)
        if (!g) {
          g = { stakeLeaders: [], wardLeaders: new Map() }
          stakeMap.set(leader.unitNameKo, g)
        }
        g.stakeLeaders.push(leader)
      } else {
        const unitId = WARD_TO_UNIT_ID.get(leader.unitNameKo)
        const stakeName = unitId ? UNIT_ID_TO_NAME.get(unitId)?.ko : undefined
        if (!stakeName) continue
        let g = stakeMap.get(stakeName)
        if (!g) {
          g = { stakeLeaders: [], wardLeaders: new Map() }
          stakeMap.set(stakeName, g)
        }
        const list = g.wardLeaders.get(leader.unitNameKo) ?? []
        if (!g.wardLeaders.has(leader.unitNameKo)) g.wardLeaders.set(leader.unitNameKo, list)
        list.push(leader)
      }
    }

    return ALL_UNITS.filter((u) => stakeMap.has(u.name.ko)).map((u) => {
      const g = stakeMap.get(u.name.ko)!
      const wardGroups = WARDS.filter((w) => w.unitId === u.id && g.wardLeaders.has(w.name.ko)).map(
        (w) => ({
          wardName: WARD_KO_TO_NAME.get(w.name.ko) ?? w.name,
          leaders: g.wardLeaders.get(w.name.ko)!,
        }),
      )
      return { stakeName: u.name, stakeLeaders: g.stakeLeaders, wardGroups }
    })
  }, [filtered])

  const handleSave = async (patch: LeaderPatch) => {
    if (!editing) throw new Error('No leader selected for editing')
    await updateLeader(editing.id, patch)
  }

  return (
    <div className={styles.page}>
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="search"
          placeholder={t('leaders.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.list}>
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height="64px" className={styles.skeletonItem} />
          ))
        ) : groups.length === 0 ? (
          <p className={styles.empty}>{t('leaders.empty')}</p>
        ) : (
          groups.map((stakeGroup) => (
            <div key={stakeGroup.stakeName.ko} className={styles.stakeGroup}>
              <h2 className={styles.stakeHeader}>{stakeGroup.stakeName[lang]}</h2>
              {stakeGroup.stakeLeaders.map((leader) => (
                <LeaderCard
                  key={leader.id}
                  leader={leader}
                  canEdit={canEdit}
                  onEdit={() => setEditing(leader)}
                />
              ))}
              {stakeGroup.wardGroups.map(({ wardName, leaders }) => (
                <div key={wardName.ko} className={styles.wardGroup}>
                  <h3 className={styles.wardHeader}>{wardName[lang]}</h3>
                  {leaders.map((leader) => (
                    <LeaderCard
                      key={leader.id}
                      leader={leader}
                      canEdit={canEdit}
                      onEdit={() => setEditing(leader)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <LeaderEditSheet leader={editing} onClose={() => setEditing(null)} onSave={handleSave} />
    </div>
  )
}
