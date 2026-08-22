import { useId, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ScheduleType } from '@/types'
import { Input, Textarea } from '@/components/ui'
import { ProjectPicker } from '@/components/domain/ProjectPicker/ProjectPicker'
import type { ScheduleFormState } from './useScheduleForm'
import styles from './DetailSection.module.scss'

export interface DetailSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  autoTitle: string
  autoLocation: string | null
  canPickProject: boolean
}

function hasAnyDetailValue(state: ScheduleFormState): boolean {
  return !!(state.location || state.customTitle || state.zoomLink || state.notes || state.projectId)
}

/**
 * 장소·제목·Zoom 링크·메모·프로젝트 — 대부분 비워 두는 선택 칸이라 요약 뒤로 접어
 * 둔다. 이 다섯 칸의 마크업(래퍼 포함)은 ScheduleFormModal.tsx에서 위젯을 바꾸지 않고
 * 그대로 옮긴 것이다(Controller ruling — 구조만 바꾼다).
 *
 * 접힌 채로 저장하면 사용자는 자동으로 채워질 제목·장소를 모른 채 저장하게 되므로,
 * 접혀 있어도 요약 줄에 그 값을 보여준다. 반대로 편집 모달처럼 이 칸들 중 하나라도
 * 이미 값이 있으면(기존 일정을 열었을 때) 그 값의 존재를 사용자가 놓치지 않도록 처음부터
 * 펼쳐서 시작한다.
 */
export function DetailSection({
  type,
  state,
  onChange,
  autoTitle,
  autoLocation,
  canPickProject,
}: DetailSectionProps) {
  const { t } = useTranslation()
  const { location, customTitle, zoomLink, notes, projectId } = state
  const [expanded, setExpanded] = useState(() => hasAnyDetailValue(state))
  const regionId = useId()

  const summary = [autoTitle, autoLocation].filter(Boolean).join(' · ')

  return (
    <div>
      <button
        type="button"
        className={styles.summaryBtn}
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className={styles.summaryLabel}>{t('schedule.detailSectionLabel')}</span>
        {summary && <span className={styles.summaryText}>{summary}</span>}
        {expanded ? <ChevronUp size={16} className={styles.chevron} /> : <ChevronDown size={16} className={styles.chevron} />}
      </button>

      {expanded && (
        <div id={regionId} className={styles.fields}>
          <Input
            label={t('schedule.locationOptional')}
            value={location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder={autoLocation ?? ''}
          />

          {type !== 'ward_visit' && (
            <Input
              label={t('schedule.customTitleOptional')}
              value={customTitle}
              onChange={(e) => onChange({ customTitle: e.target.value })}
              placeholder={autoTitle}
            />
          )}

          {type !== 'ward_visit' && (
            <Input
              label={t('schedule.zoomLinkOptional')}
              type="url"
              value={zoomLink}
              onChange={(e) => onChange({ zoomLink: e.target.value })}
              placeholder="https://zoom.us/j/..."
            />
          )}

          <Textarea
            label={t('schedule.notesLabelOptional')}
            className={styles.textarea}
            wrapperClassName={styles.fieldGroup}
            value={notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder={t('schedule.notesLabelOptional')}
            rows={3}
          />

          {canPickProject && (
            <ProjectPicker value={projectId} onChange={(next) => onChange({ projectId: next })} />
          )}
        </div>
      )}
    </div>
  )
}
