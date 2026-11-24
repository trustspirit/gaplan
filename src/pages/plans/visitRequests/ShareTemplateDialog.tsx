import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Languages } from 'lucide-react'
import { toast } from 'sonner'
import { Button, ResponsiveDialog, Textarea } from '@/components/ui'
import {
  defaultShareTemplate,
  renderShareTemplate,
  SHARE_TEMPLATE_MAX,
  SHARE_TOKENS,
  type ShareLang,
  type ShareValues,
} from '@/utils/shareTemplate'
import styles from './ShareTemplateDialog.module.scss'

type Templates = Record<ShareLang, string | null>

interface Props {
  open: boolean
  /** 지금 저장된 안내문. 없으면 그 언어의 기본 안내문으로 시작한다 */
  templates: Templates
  /** 미리보기에 쓸 값(첫 스테이크) — 언어마다 */
  samples: Record<ShareLang, ShareValues>
  saving: boolean
  /** 기본 안내문과 같으면 null로 넘긴다 */
  onSave: (templates: Templates) => void
  onClose: () => void
  /** 한국어 안내문을 교회 공식 문체의 영어로 옮긴다(Claude). 없으면 영어는 손으로만 고친다 */
  translate?: (korean: string) => Promise<string>
}

const LANGS: ShareLang[] = ['ko', 'en']

/**
 * 스테이크별 링크에 붙일 안내문 고치기 — 한국어와 영어를 따로. 한 번 저장하면 모든 요청에 쓴다.
 * {자리}는 복사할 때 스테이크마다 채운다 — 단추를 누르면 커서 자리에 넣는다.
 * 한국어를 고쳐 저장하면 영어는 Claude가 새로 옮긴다 — 이번에 영어를 손으로 고쳤으면 그대로 둔다.
 */
export function ShareTemplateDialog({ open, templates, samples, saving, onSave, onClose, translate }: Props) {
  const { t } = useTranslation()
  const [lang, setLang] = useState<ShareLang>('ko')
  const [texts, setTexts] = useState<Record<ShareLang, string>>({
    ko: templates.ko ?? defaultShareTemplate('ko'),
    en: templates.en ?? defaultShareTemplate('en'),
  })
  const [enTouched, setEnTouched] = useState(false)
  const [translating, setTranslating] = useState(false)
  const fieldId = useId()

  // 열 때마다 저장된 안내문으로 다시 시작한다
  useEffect(() => {
    if (!open) return
    setTexts({ ko: templates.ko ?? defaultShareTemplate('ko'), en: templates.en ?? defaultShareTemplate('en') })
    setEnTouched(false)
  }, [open, templates.ko, templates.en])

  const text = texts[lang]
  const setText = (v: string) => {
    if (lang === 'en') setEnTouched(true)
    setTexts((prev) => ({ ...prev, [lang]: v }))
  }

  /** 한국어 안내문을 영어로 옮긴다. 실패하면 null(알림은 여기서) */
  const toEnglish = async (): Promise<string | null> => {
    if (!translate) return null
    setTranslating(true)
    try {
      return await translate(texts.ko)
    } catch {
      toast.error(t('visitRequest.shareTemplate.translateFailed'))
      return null
    } finally {
      setTranslating(false)
    }
  }

  const retranslate = async () => {
    const en = await toEnglish()
    if (en === null) return
    setTexts((prev) => ({ ...prev, en }))
    setEnTouched(true)
  }

  const insert = (token: string) => {
    const el = document.getElementById(fieldId) as HTMLTextAreaElement | null
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    setText((text.slice(0, start) + token + text.slice(end)).slice(0, SHARE_TEMPLATE_MAX))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const isDefault = (l: ShareLang) => texts[l].trim() === defaultShareTemplate(l).trim()
  const save = async () => {
    const koSaved = (templates.ko ?? defaultShareTemplate('ko')).trim()
    let en = texts.en
    if (translate && !enTouched && texts.ko.trim() !== koSaved) {
      // 한국어를 기본으로 되돌렸으면 영어도 기본으로, 아니면 새로 옮긴다
      const next = isDefault('ko') ? defaultShareTemplate('en') : await toEnglish()
      if (next !== null) {
        en = next
        setTexts((prev) => ({ ...prev, en: next }))
      }
    }
    onSave({
      ko: isDefault('ko') ? null : texts.ko,
      en: en.trim() === defaultShareTemplate('en').trim() ? null : en,
    })
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} title={t('visitRequest.shareTemplate.title')} className={styles.dialog}>
      <div className={styles.body}>
        <p className={styles.hint}>{t('visitRequest.shareTemplate.hint')}</p>
        <div className={styles.tabs} role="tablist" aria-label={t('visitRequest.shareTemplate.langLabel')}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              className={clsx(styles.tab, lang === l && styles.tabOn)}
              onClick={() => setLang(l)}
            >
              {t(`visitRequest.shareTemplate.lang.${l}`)}
            </button>
          ))}
        </div>
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
            {lang === 'en' && translate && (
              <p className={styles.autoNote}>
                <span>{t('visitRequest.shareTemplate.autoNote')}</span>
                <Button variant="ghost" size="sm" loading={translating} disabled={!texts.ko.trim()} onClick={retranslate}>
                  <Languages size={14} aria-hidden />
                  {t('visitRequest.shareTemplate.retranslate')}
                </Button>
              </p>
            )}
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
            <span className={styles.previewLabel}>
              {t('visitRequest.shareTemplate.preview', { unit: samples[lang].unit })}
            </span>
            <pre className={styles.preview}>{renderShareTemplate(text, samples[lang])}</pre>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" disabled={isDefault(lang)} onClick={() => setText(defaultShareTemplate(lang))}>
            {t('visitRequest.shareTemplate.reset')}
          </Button>
          <span className={styles.spacer} />
          {translating && <span className={styles.status}>{t('visitRequest.shareTemplate.translating')}</span>}
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving || translating}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            loading={saving || translating}
            disabled={!texts.ko.trim() || !texts.en.trim()}
            onClick={save}
          >
            {t('visitRequest.shareTemplate.save')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
