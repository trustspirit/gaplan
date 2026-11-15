import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Textarea } from '@/components/ui/Textarea/Textarea'
import { GUIDANCE_MAX, GUIDANCE_PRESET_KEYS } from '@/utils/visitRequest'
import styles from './GuidanceField.module.scss'

interface Props {
  value: string
  onChange: (value: string) => void
}

/**
 * 회장들에게 강조할 말. 자주 쓰는 문장을 눌러 넣고 고칠 수 있다 — 누르면 바꿔 넣는다(덧붙이지 않는다):
 * 강조는 한두 문장이어야 눈에 띈다.
 */
export function GuidanceField({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.field}>
      <Textarea
        label={t('visitRequest.guidance')}
        hint={t('visitRequest.guidanceHint')}
        value={value}
        rows={2}
        maxLength={GUIDANCE_MAX}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={styles.presets} role="group" aria-label={t('visitRequest.guidancePresets')}>
        {GUIDANCE_PRESET_KEYS.map((key) => {
          const text = t(key)
          return (
            <button
              key={key}
              type="button"
              className={clsx(styles.preset, value === text && styles.presetOn)}
              aria-pressed={value === text}
              onClick={() => onChange(text)}
            >
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
