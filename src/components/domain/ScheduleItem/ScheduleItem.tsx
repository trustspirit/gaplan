import { useState, useRef, useEffect } from 'react'
import { MapPin, Users, CalendarPlus, Coffee, MoreVertical, Video, Building2, Check, FileText, ChevronUp, UserCheck } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { Schedule } from '@/types'
import { DeleteConfirmSheet } from '@/components/ui'
import styles from './ScheduleItem.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function buildGCalUrl(schedule: Schedule, unitName: string): string {
  const locationLabel = schedule.wardName ? `${unitName} ${schedule.wardName}` : unitName
  const title = schedule.type === 'ward_visit'
    ? `와드 방문 - ${locationLabel}`
    : schedule.type === 'interview'
      ? `접견 - ${unitName}`
      : `모임 - ${unitName}`
  const start = `${schedule.date.replace(/-/g, '')}T${schedule.startTime.replace(':', '')}00`
  const end = `${schedule.date.replace(/-/g, '')}T${schedule.endTime.replace(':', '')}00`
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}` })
  return `https://calendar.google.com/calendar/render?${params}`
}

function NotesContent({ text }: { text: string }) {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const url = match[0]
    parts.push(
      <a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className={styles.notesLink}>
        {url}
      </a>
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <p className={styles.notesText}>{parts}</p>
}

interface ScheduleItemProps {
  schedule: Schedule
  unitName: string
  past?: boolean
  showCalendarAdd?: boolean
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ScheduleItem({
  schedule,
  unitName,
  past,
  showCalendarAdd = false,
  canEdit,
  onEdit,
  onDelete,
}: ScheduleItemProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuOpen])

  const isVisit = schedule.type === 'ward_visit'
  const isMeeting = schedule.type === 'meeting'
  const isAttendance = schedule.type === 'general_attendance'
  const date = dayjs(schedule.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = past ?? date.isBefore(dayjs(), 'day')
  const hasNotes = !!schedule.notes?.trim()
  const deleteDescription = schedule.customTitle ?? unitName

  const typeClass = isVisit ? styles.visit : isMeeting ? styles.meeting : isAttendance ? styles.attendance : styles.interview

  return (
    <>
    <div className={styles.wrapper}>
      {/* ── Main row ── */}
      <div className={styles.row}>
        <div className={clsx(styles.colorBar, isVisit ? styles.visitBar : isMeeting ? styles.meetingBar : isAttendance ? styles.attendanceBar : styles.interviewBar)} />

        <div className={clsx(styles.dateCol, typeClass, isPast && styles.past)}>
          <span className={styles.date}>{date.format('M.D')}</span>
          <span className={styles.dow}>{dow}</span>
        </div>

        <div className={clsx(styles.item, typeClass, isPast && styles.past)}>
          <div className={styles.info}>
            <div className={styles.typeBadge}>
              {isVisit ? <MapPin size={11} />
              : isMeeting ? <Coffee size={11} />
              : isAttendance ? <Building2 size={11} />
              : <Users size={11} />}
              <span>{t(`schedule.type.${schedule.type}`)}</span>
            </div>
            <p className={styles.unit}>
              {schedule.customTitle ?? unitName}
              {!schedule.customTitle && schedule.wardName && <span className={styles.wardName}> · {schedule.wardName}</span>}
              {isAttendance && (
                <span className={styles.verifiedBadge} aria-label="참석 확인됨">
                  <Check size={9} strokeWidth={3.5} />
                </span>
              )}
            </p>
            <p className={styles.time}>{schedule.startTime} – {schedule.endTime}</p>
            {isVisit && schedule.presidentAccompanied && (
              <span className={styles.presidentBadge} title="스테이크 회장 동행">
                <UserCheck size={11} />
                <span>회장 동행</span>
              </span>
            )}
            {schedule.zoomLink && (
              <a
                href={schedule.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.zoomLink}
                onClick={e => e.stopPropagation()}
              >
                <Video size={11} />
                <span>Zoom</span>
              </a>
            )}
          </div>

          {hasNotes && (
            <button
              type="button"
              className={clsx(styles.notesBtn, notesOpen && styles.notesBtnOpen)}
              onClick={e => { e.stopPropagation(); setNotesOpen(v => !v) }}
              title="메모 보기"
              aria-expanded={notesOpen}
            >
              {notesOpen ? <ChevronUp size={14} /> : <FileText size={14} />}
            </button>
          )}

          {isPast && (
            <span className={styles.pastBadge}>
              <Check size={10} strokeWidth={2.5} />
              <span className={styles.pastBadgeText}>{t('common.complete')}</span>
            </span>
          )}
          {showCalendarAdd && !isPast && (
            <a
              href={buildGCalUrl(schedule, unitName)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.calendarAddBtn}
              title="내 캘린더에 추가"
            >
              <CalendarPlus size={15} />
            </a>
          )}
        </div>

        {canEdit && (
          <div className={styles.kebabWrapper}>
            <button
              ref={btnRef}
              type="button"
              className={styles.kebabBtn}
              onClick={e => {
                e.stopPropagation()
                if (!menuOpen && btnRef.current) {
                  const rect = btnRef.current.getBoundingClientRect()
                  setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                }
                setMenuOpen(prev => !prev)
              }}
              aria-label="더보기"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && menuPos && (
              <>
                <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
                <div className={styles.menu} style={{ top: menuPos.top, right: menuPos.right }}>
                  <button type="button" onClick={() => { setMenuOpen(false); onEdit?.() }}>편집</button>
                  {onDelete && (
                    <button type="button" className={styles.deleteMenuItem} onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true) }}>삭제</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Notes panel ── */}
      {notesOpen && hasNotes && (
        <div className={styles.notesPanel}>
          <NotesContent text={schedule.notes!} />
        </div>
      )}
    </div>
    {onDelete && (
      <DeleteConfirmSheet
        open={showDeleteConfirm}
        description={deleteDescription}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    )}
    </>
  )
}
