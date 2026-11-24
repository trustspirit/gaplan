import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Copy, ExternalLink, MessageSquareText, PencilLine } from 'lucide-react'
import { setUnitSundays } from '@/services/visitRequestService'
import { recommendUrl } from '@/utils/visitRequest'
import { defaultShareTemplate, renderShareTemplate, type ShareValues } from '@/utils/shareTemplate'
import { unitSundayOptions } from '@/utils/unitSundays'
import { REGIONS } from '@/constants/regions'
import { unavailableReasons } from './sundayReasons'
import { StakeTable, type StakeTableColumn } from './StakeTable'
import { ShareTemplateDialog } from './ShareTemplateDialog'
import { planMatrix, type MatrixCell } from './stakeSundayMatrix'
import type { VisitRecommendation, VisitRequest, WardVisitStat } from '@/types'
import type { SundayStatus } from '../../../../functions/src/visitSundayAvailability'
import styles from './StakeLinkList.module.scss'

interface Props {
  request: VisitRequest
  recommendations: VisitRecommendation[]
  sundayStatus: Record<string, SundayStatus>
  wardStats: Record<string, WardVisitStat>
  /** 일요일 상황·방문 기록을 받았는가 — 받기 전에는 마지막 방문을 적지 않는다 */
  ready: boolean
  onCopy: (text: string) => void
  /** 저장해 둔 안내문. null이면 기본 안내문 */
  shareTemplate: string | null
  /** 안내문 저장 — 못 하는 화면(로그인 정보 없음)이면 넘기지 않는다 */
  onSaveTemplate?: (template: string | null) => Promise<void>
}

/**
 * 스테이크별 배정 표 — 스테이크마다 따로 보내는 추천 링크와 그 링크에 넣을 일요일.
 * 링크 하나는 그 스테이크만 연다 — 다른 스테이크의 추천은 보이지 않고, 다른 곳으로 확정된 날은 "확정됨"으로만 보인다.
 * 칸을 눌러 그 스테이크에 물어볼 일요일을 넣고 뺀다(그 스테이크가 가능한 날만).
 */
export function StakeLinkList({
  request, recommendations, sundayStatus, wardStats, ready, onCopy, shareTemplate, onSaveTemplate,
}: Props) {
  const { t, i18n } = useTranslation()
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const today = dayjs().format('YYYY-MM-DD')
  const responded = new Map(recommendations.map((r) => [r.unitId, r]))
  const regionName = (id: string | undefined) => REGIONS.find((r) => r.id === id)?.name ?? id ?? ''
  const unitName = (id: string) => request.units.find((u) => u.id === id)?.ko ?? id

  const matrix = useMemo(
    () => planMatrix({ request, roles: request.unitSundayRoles ?? {}, status: sundayStatus, wardStats }),
    [request, sundayStatus, wardStats],
  )

  /** 고를 수 없는 이유를 자세히 — 로그인한 칠십인·집행서기만 보는 화면이라 일정 제목까지 적는다 */
  const cellDetail = (unitId: string, date: string, cell: MatrixCell): string | undefined => {
    if (cell.kind !== 'blocked') return undefined
    const st = sundayStatus[date]
    switch (cell.block) {
      case 'otherRegion':
        return t('visitRequest.otherRegionTurn', { region: regionName(request.sundayRegions?.[date]) })
      case 'busy':
        return unavailableReasons(date, st, t).join(' / ')
      case 'unitBlocked':
        return st?.unitBlocks[unitId]
      case 'decidedOther': {
        const d = request.decisions[date]
        return t('visitRequest.decidedElsewhere', { unit: unitName(d.unitId), ward: d.wardName })
      }
    }
  }

  const selectedOf = (unitId: string) =>
    unitSundayOptions(request, unitId, sundayStatus).filter((o) => o.selected).map((o) => o.date)

  const toggle = async (unitId: string, date: string) => {
    const now = selectedOf(unitId)
    const next = now.includes(date) ? now.filter((d) => d !== date) : [...now, date]
    setSaving(unitId)
    try {
      await setUnitSundays(request.id, unitId, next)
    } catch {
      toast.error(t('visitRequest.unitSundaysFailed'))
    } finally {
      setSaving(null)
    }
  }

  const shareValues = (unitId: string, link: string): ShareValues => ({
    title: request.title,
    unit: unitName(unitId),
    seventy: request.seventyName,
    dates: selectedOf(unitId).map((d) => dayjs(d).format('M/D')).join(', '),
    due: request.dueDate ? dayjs(request.dueDate).format(t('recommend.dateFormat')) : '',
    guidance: request.guidance ?? '',
    link,
  })
  const template = shareTemplate ?? defaultShareTemplate(i18n.language === 'en' ? 'en' : 'ko')
  const shareMessage = (unitId: string, url: string) => renderShareTemplate(template, shareValues(unitId, url))
  const sampleUnit = request.units[0]
  const sampleToken = sampleUnit ? request.unitTokens?.[sampleUnit.id] : undefined

  const saveTemplate = async (next: string | null) => {
    if (!onSaveTemplate) return
    setSavingTemplate(true)
    try {
      await onSaveTemplate(next)
      toast.success(t('visitRequest.shareTemplate.saved'))
      setEditingTemplate(false)
    } catch {
      toast.error(t('visitRequest.shareTemplate.saveFailed'))
    } finally {
      setSavingTemplate(false)
    }
  }

  const columns: StakeTableColumn[] = [
    {
      key: 'response',
      header: t('visitRequest.matrix.response'),
      render: (row) => {
        const rec = responded.get(row.unit.id)
        if (!rec) return <span className={styles.pending}>{t('visitRequest.matrix.pending')}</span>
        return (
          <span className={styles.responded} title={rec.note || undefined}>
            <span className={styles.respondedMain}>
              {t('visitRequest.matrix.responded', { date: dayjs(rec.submittedAt).format('M/D') })}
            </span>
            <span className={styles.respondedSub}>{t('visitRequest.matrix.picked', { count: rec.picks.length })}</span>
          </span>
        )
      },
    },
    {
      key: 'links',
      header: t('visitRequest.matrix.links'),
      render: (row) => {
        const token = request.unitTokens?.[row.unit.id]
        if (!token) return <span className={styles.pending}>{t('visitRequest.linkPreparing')}</span>
        const url = recommendUrl(request.id, token)
        const none = row.total === 0 && !Object.values(row.cells).some((c) => c.kind === 'decided')
        return (
          <span className={styles.links}>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={none}
              aria-label={t('visitRequest.matrix.copyLink', { unit: row.unit.ko })}
              title={t('visitRequest.copyLink')}
              onClick={() => onCopy(url)}
            >
              <Copy size={15} aria-hidden />
              <span>{t('visitRequest.copyLink')}</span>
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={none}
              aria-label={t('visitRequest.matrix.copyMessage', { unit: row.unit.ko })}
              title={t('visitRequest.copyMessage')}
              onClick={() => onCopy(shareMessage(row.unit.id, url))}
            >
              <MessageSquareText size={15} aria-hidden />
              <span>{t('visitRequest.matrix.messageShort')}</span>
            </button>
            <a
              className={styles.linkIcon}
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={t('visitRequest.matrix.openLink', { unit: row.unit.ko })}
              title={t('visitRequest.open')}
            >
              <ExternalLink size={15} aria-hidden />
            </a>
          </span>
        )
      },
    },
  ]

  // 표 아래 참고: 스테이크 행사로 막힌 날, 고를 수 있는 날의 이 스테이크 관련 행사, 회장이 남긴 말
  const notes = request.units.flatMap((u) =>
    unitSundayOptions(request, u.id, sundayStatus).flatMap((o) => {
      if (o.block === 'unitBlocked') {
        return [{ key: `${u.id}-${o.date}-b`, date: o.date, unit: u.ko, text: sundayStatus[o.date]?.unitBlocks[u.id] ?? t('visitRequest.unitSundayBlock.unitBlocked') }]
      }
      if (o.block) return []
      return (sundayStatus[o.date]?.notes ?? [])
        .filter((n) => !n.unitIds || n.unitIds.includes(u.id))
        .map((n, i) => ({ key: `${u.id}-${o.date}-${i}`, date: o.date, unit: u.ko, text: n.title }))
    }),
  )
  const presidentNotes = recommendations.filter((r) => r.note).map((r) => ({ unit: unitName(r.unitId), note: r.note! }))

  return (
    <div className={styles.wrap}>
      <StakeTable
        matrix={matrix}
        today={today}
        showLastVisit={ready}
        onToggle={(unitId, date) => void toggle(unitId, date)}
        savingUnit={saving}
        cellDetail={cellDetail}
        columns={columns}
      />
      {/* 안내문 — 한 번 고쳐 두면 모든 요청의 '안내문 복사'에 쓴다 */}
      <div className={styles.template}>
        <MessageSquareText size={15} aria-hidden className={styles.templateIcon} />
        <span className={styles.templateLabel}>
          {shareTemplate ? t('visitRequest.shareTemplate.custom') : t('visitRequest.shareTemplate.default')}
        </span>
        <span className={styles.templateText}>{template.split('\n')[0]}</span>
        {onSaveTemplate && sampleUnit && (
          <button type="button" className={styles.linkBtn} onClick={() => setEditingTemplate(true)}>
            <PencilLine size={15} aria-hidden />
            <span>{t('visitRequest.shareTemplate.button')}</span>
          </button>
        )}
      </div>
      {onSaveTemplate && sampleUnit && (
        <ShareTemplateDialog
          open={editingTemplate}
          template={shareTemplate}
          sample={shareValues(sampleUnit.id, sampleToken ? recommendUrl(request.id, sampleToken) : 'https://…')}
          saving={savingTemplate}
          onSave={(next) => void saveTemplate(next)}
          onClose={() => !savingTemplate && setEditingTemplate(false)}
        />
      )}
      {(notes.length > 0 || presidentNotes.length > 0) && (
        <div className={styles.notes}>
          {notes.length > 0 && (
            <section>
              <h4 className={styles.notesTitle}>{t('visitRequest.matrix.notesTitle')}</h4>
              <ul className={styles.noteList}>
                {notes.map((n) => (
                  <li key={n.key}>
                    <span className={styles.noteDate}>{dayjs(n.date).format('M/D')}</span>
                    <span className={styles.noteUnit}>{n.unit}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {presidentNotes.length > 0 && (
            <section>
              <h4 className={styles.notesTitle}>{t('visitRequest.matrix.presidentNotes')}</h4>
              <ul className={styles.noteList}>
                {presidentNotes.map((n) => (
                  <li key={n.unit}>
                    <span className={styles.noteUnit}>{n.unit}</span>
                    <span>{n.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
