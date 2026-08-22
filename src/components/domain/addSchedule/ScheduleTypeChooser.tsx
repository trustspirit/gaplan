import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Coffee, Users, Building2, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { AddScheduleChoice } from './addScheduleChoices'
import styles from './ScheduleTypeChooser.module.scss'

// ScheduleItem.tsx가 이미 쓰는 종류별 아이콘과 맞춘다.
const CHOICE_ICON: Record<AddScheduleChoice, React.ReactNode> = {
  ward_visit: <MapPin size={18} />,
  interview: <Users size={18} />,
  meeting: <Coffee size={18} />,
  general_schedule: <Building2 size={18} />,
}

interface ScheduleTypeChooserProps {
  choices: AddScheduleChoice[]
  onPick: (choice: AddScheduleChoice) => void
  onClose: () => void
}

export function ScheduleTypeChooser({ choices, onPick, onClose }: ScheduleTypeChooserProps) {
  const { t } = useTranslation()

  // 입력할 게 없는 화면이므로 닫기는 확인 없이 바로 — 폼 모달의 requestClose처럼
  // isDirty를 검사할 이유가 없다.
  const sheetRef = useRef<HTMLDivElement>(null)
  useFocusTrap(sheetRef, true, onClose)
  useEffect(() => {
    acquireScrollLock()
    return releaseScrollLock
  }, [])

  const nameFor = (choice: AddScheduleChoice) =>
    choice === 'general_schedule'
      ? t('schedule.addChoice.general_schedule.label')
      : t(`schedule.type.${choice}`)
  const descFor = (choice: AddScheduleChoice) => t(`schedule.addChoice.${choice}.desc`)

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{t('schedule.addChooserTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.cardList}>
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.card}
              onClick={() => onPick(choice)}
            >
              <span className={styles.cardIcon}>{CHOICE_ICON[choice]}</span>
              <span className={styles.cardBody}>
                <span className={styles.cardName}>{nameFor(choice)}</span>
                <span className={styles.cardDesc}>{descFor(choice)}</span>
              </span>
              <ChevronRight size={18} className={styles.cardArrow} />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
