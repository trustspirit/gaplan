import { useTranslation } from 'react-i18next'
import type { ScheduleType } from '@/types'
import { Input, Textarea } from '@/components/ui'
import { ProjectPicker } from '@/components/domain/ProjectPicker/ProjectPicker'
import { ZoomLinkPicker } from './ZoomLinkPicker'
import type { ScheduleFormState } from './useScheduleForm'
import styles from './DetailSection.module.scss'
// .fieldGroup/.textarea/.hint are the exact classes ScheduleFormModal's notes Textarea and
// related-visit hint used — shared from there (the same pattern WhenSection.tsx uses) rather
// than duplicated, so the two can't silently drift apart.
import sharedStyles from '../ScheduleFormModal/ScheduleFormModal.module.scss'

export interface DetailSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  autoTitle: string
  autoLocation: string | null
  canPickProject: boolean
}

/**
 * 장소·제목·Zoom 링크·메모·프로젝트 — 다섯 칸을 항상 펼쳐서 보여준다.
 *
 * 예전에는 이 다섯 칸을 "상세 정보"라는 선택적으로 들리는 라벨 뒤로 접어 뒀지만, 온라인
 * 모임에서 Zoom 링크가 그 라벨 뒤 두 번의 클릭 거리에 있었고(장소도 사용자가 직접 표시해
 * 달라고 했던 값이다), 생성 모달은 접힌 채 시작하고 편집 모달은 펼쳐진 채 시작해 두 모달의
 * 규칙마저 어긋나 있었다 — 접기를 완전히 없앤다(Controller ruling, 2026-08-22).
 *
 * 접혀 있을 때 보여주던 "자동으로 채워질 제목·장소" 정보는 이제 각 입력칸의 placeholder가
 * 대신한다. 다만 ward_visit은 제목 입력칸 자체가 렌더되지 않으므로(대상이 곧 방문지라
 * customTitle 개념이 없다) placeholder로 자동 제목을 보여줄 곳이 없다 — 그때만 한 줄
 * 힌트로 autoTitle을 알려준다.
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

  return (
    <div className={styles.fields}>
      {type === 'ward_visit' && autoTitle && (
        <p className={sharedStyles.hint}>{t('schedule.autoTitleHint', { title: autoTitle })}</p>
      )}

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
        // ZoomLinkPicker는 위 이동 태스크 이후에 새로 붙은 편의 기능이다 — 저장된
        // 링크가 있으면 고르는 select를, 새 URL이면 저장 버튼을 보여준다. 이 입력칸
        // 자체(직접 타이핑)는 그대로다: onChange는 여전히 이 Input 하나로만 나간다.
        <div className={styles.zoomLinkGroup}>
          <ZoomLinkPicker value={zoomLink} onChange={(url) => onChange({ zoomLink: url })} />
          <Input
            label={t('schedule.zoomLinkOptional')}
            type="url"
            value={zoomLink}
            onChange={(e) => onChange({ zoomLink: e.target.value })}
            placeholder="https://zoom.us/j/..."
          />
        </div>
      )}

      <Textarea
        label={t('schedule.notesLabelOptional')}
        className={sharedStyles.textarea}
        wrapperClassName={sharedStyles.fieldGroup}
        value={notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder={t('schedule.notesLabelOptional')}
        rows={3}
      />

      {canPickProject && (
        <ProjectPicker value={projectId} onChange={(next) => onChange({ projectId: next })} />
      )}
    </div>
  )
}
