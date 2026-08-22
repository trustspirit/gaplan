import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useZoomLinks } from '@/hooks/useZoomLinks'
import { isHttpUrl } from '@/utils/zoomLinkRules'
import { Select, Input, Button } from '@/components/ui'
import styles from './ZoomLinkPicker.module.scss'

export interface ZoomLinkPickerProps {
  /** The Zoom URL field's current value — never owned here, only read/offered a fill. */
  value: string
  onChange: (url: string) => void
}

/**
 * Zoom URL 입력칸 위에 얹는 편의 도구. 두 조각이 서로 독립이다 — ProjectPicker처럼
 * 이 컴포넌트가 스스로 useZoomLinks()로 데이터를 구해 온다(부모 프롭으로 안 받는다),
 * 두 모달(생성/편집) 모두에서 같은 방식으로 붙게 하기 위해서다.
 *
 * 1) 저장된 링크가 있으면 고르는 select. 저장된 게 하나도 없으면 이 select는 아예
 *    렌더되지 않는다 — 직접 입력이 항상 기본 경로이지 이 select가 그걸 가리면 안 된다.
 * 2) 지금 입력칸 값이 유효한 http(s) URL이면서 아직 저장 안 된 새 URL이면, 저장 여부와
 *    무관하게(저장된 링크가 0개여도) "저장" 버튼을 보여준다 — 그래야 첫 링크를 저장할 수 있다.
 */
export function ZoomLinkPicker({ value, onChange }: ZoomLinkPickerProps) {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)
  const { links, add } = useZoomLinks(user?.uid)
  const [draftLabel, setDraftLabel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const trimmedValue = value.trim()
  const matchedLink = links.find((l) => l.url.trim() === trimmedValue)
  const canOfferSave = trimmedValue !== '' && isHttpUrl(trimmedValue) && !matchedLink

  const handlePick = (id: string) => {
    const link = links.find((l) => l.id === id)
    if (link) onChange(link.url)
  }

  const openSaveForm = () => setDraftLabel('')
  const closeSaveForm = () => setDraftLabel(null)

  const confirmSave = async () => {
    if (draftLabel === null) return
    setSaving(true)
    const result = await add({ label: draftLabel, url: trimmedValue })
    setSaving(false)
    if (result.ok) {
      toast.success(t('schedule.zoomLinkSaved'))
      setDraftLabel(null)
    } else {
      toast.error(t(`schedule.zoomLinkError.${result.reason}`))
    }
  }

  return (
    <div className={styles.wrap}>
      {links.length > 0 && (
        <Select
          label={t('schedule.zoomLinkPickerLabel')}
          value={matchedLink?.id ?? ''}
          onChange={(e) => handlePick(e.target.value)}
          options={links.map((l) => ({ value: l.id, label: l.label }))}
          placeholder={t('schedule.zoomLinkPickerPlaceholder')}
        />
      )}

      {canOfferSave && draftLabel === null && (
        <Button type="button" variant="ghost" size="sm" onClick={openSaveForm}>
          {t('schedule.zoomLinkSaveBtn')}
        </Button>
      )}

      {draftLabel !== null && (
        <div className={styles.saveForm}>
          <Input
            label={t('schedule.zoomLinkLabelPrompt')}
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void confirmSave()
              }
            }}
            placeholder={t('schedule.zoomLinkLabelExample')}
          />
          <div className={styles.saveActions}>
            <Button type="button" variant="ghost" size="sm" onClick={closeSaveForm} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={confirmSave} loading={saving}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
