import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import styles from './WardPicker.module.scss'

interface Props {
  wards: { id: string; label: string }[]
  /** "6개월 전" 같은 방문 기록 */
  recencyOf: (wardId: string) => string
  value: string
  onChange: (wardId: string) => void
  legend?: string
}

/**
 * 일요일 하나에 추천할 와드 고르기. 네이티브 select 대신 버튼 목록 — 휴대폰마다 메뉴가 엉뚱한
 * 자리에 뜨고, 와드마다 방문 기록을 옆에 보여 줄 수 없어서. 목록 카드와 달력이 같이 쓴다.
 */
export function WardPicker({ wards, recencyOf, value, onChange, legend }: Props) {
  const { t } = useTranslation()
  return (
    <fieldset className={styles.field}>
      {legend && <legend className={styles.legend}>{legend}</legend>}
      <div className={styles.list}>
        {wards.map((w) => {
          const on = value === w.id
          return (
            <button
              key={w.id}
              type="button"
              aria-pressed={on}
              className={clsx(styles.ward, on && styles.wardOn)}
              onClick={() => onChange(on ? '' : w.id)}
            >
              <span className={styles.name}>{w.label}</span>
              <span className={styles.recency}>{recencyOf(w.id)}</span>
            </button>
          )
        })}
        {value && (
          <button type="button" className={styles.clear} onClick={() => onChange('')}>
            {t('recommend.clearPick')}
          </button>
        )}
      </div>
    </fieldset>
  )
}
