import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, ResponsiveDialog, Textarea } from '@/components/ui'
import {
  defaultShareTemplate,
  renderShareTemplate,
  SHARE_TEMPLATE_MAX,
  SHARE_TOKENS,
  type ShareValues,
} from '@/utils/shareTemplate'
import styles from './ShareTemplateDialog.module.scss'

interface Props {
  open: boolean
  /** 지금 저장된 안내문. 없으면 기본 안내문으로 시작한다 */
  template: string | null
  /** 미리보기에 쓸 값(첫 스테이크) */
  sample: ShareValues
  saving: boolean
  onSave: (template: string | null) => void
  onClose: () => void
}

/**
 * 스테이크별 링크에 붙일 안내문 고치기. 한 번 저장하면 모든 요청에 쓴다.
 * {자리}는 복사할 때 스테이크마다 채운다 — 단추를 누르면 커서 자리에 넣는다.
 */
export function ShareTemplateDialog({ open, template, sample, saving, onSave, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ko'
  const fallback = defaultShareTemplate(lang)
  const [text, setText] = useState(template ?? fallback)
  const fieldId = useId()

  // 열 때마다 저장된 안내문으로 다시 시작한다
  useEffect(() => {
    if (open) setText(template ?? fallback)
  }, [open, template, fallback])

  const insert = (token: string) => {
    const el = document.getElementById(fieldId) as HTMLTextAreaElement | null
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = (text.slice(0, start) + token + text.slice(end)).slice(0, SHARE_TEMPLATE_MAX)
    setText(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const isDefault = text.trim() === fallback.trim()
  return (
    <ResponsiveDialog open={open} onClose={onClose} title={t('visitRequest.shareTemplate.title')} className={styles.dialog}>
      <div className={styles.body}>
        <p className={styles.hint}>{t('visitRequest.shareTemplate.hint')}</p>
        <div className={styles.editor}>
          <div className={styles.edit}>
            <Textarea
              id={fieldId}
              label={t('visitRequest.shareTemplate.label')}
              value={text}
              rows={9}
              maxLength={SHARE_TEMPLATE_MAX}
              onChange={(e) => setText(e.target.value)}
            />
            <div className={styles.tokens} role="group" aria-label={t('visitRequest.shareTemplate.tokensLabel')}>
              {SHARE_TOKENS.map((tk) => (
                <button
                  key={tk.key}
                  type="button"
                  className={styles.token}
                  title={t(`visitRequest.shareTemplate.token.${tk.key}`)}
                  onClick={() => insert(`{${tk[lang]}}`)}
                >
                  {`{${tk[lang]}}`}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.previewCol}>
            <span className={styles.previewLabel}>{t('visitRequest.shareTemplate.preview', { unit: sample.unit })}</span>
            <pre className={styles.preview}>{renderShareTemplate(text, sample)}</pre>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" disabled={isDefault} onClick={() => setText(fallback)}>
            {t('visitRequest.shareTemplate.reset')}
          </Button>
          <span className={styles.spacer} />
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" loading={saving} disabled={!text.trim()} onClick={() => onSave(isDefault ? null : text)}>
            {t('visitRequest.shareTemplate.save')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
