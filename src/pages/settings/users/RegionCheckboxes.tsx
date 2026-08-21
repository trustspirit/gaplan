import { useTranslation } from 'react-i18next'
import { REGIONS } from '@/constants/regions'
import styles from './RegionCheckboxes.module.scss'

/**
 * 칠십인의 담당 지역 고르기. UserManagement 안에 다섯 번 복제돼 있던 것을 하나로
 * 모았다. 선택 집합은 호출자가 갖는다 — 이 컴포넌트는 어느 지역이 눌렸는지만 알린다.
 *
 * labelKey는 초대/편집 폼의 `user.inviteRegion`("담당 지역")과 사전등록 폼의
 * `user.preRegRegion`("지역")이 서로 다른 문구를 쓰던 것을 그대로 보존하기 위한 것이다.
 */
export function RegionCheckboxes({
  selected,
  onToggle,
  disabled,
  labelKey = 'user.inviteRegion',
}: {
  selected: Set<string>
  onToggle: (regionId: string) => void
  disabled?: boolean
  labelKey?: string
}) {
  const { t } = useTranslation()
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {t(labelKey)} ({t('user.inviteRegionHint')})
      </legend>
      <div className={styles.list}>
        {REGIONS.map((region) => (
          <label key={region.id} className={styles.row}>
            <input
              type="checkbox"
              checked={selected.has(region.id)}
              disabled={disabled}
              onChange={() => onToggle(region.id)}
              className={styles.checkbox}
            />
            <span className={styles.name}>{region.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
