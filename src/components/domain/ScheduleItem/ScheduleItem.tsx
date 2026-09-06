import { useState, useRef, useEffect } from 'react'
import {
  MapPin,
  Users,
  CalendarPlus,
  Coffee,
  MoreVertical,
  Video,
  Building2,
  Check,
  FileText,
  ChevronUp,
  UserCheck,
} from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { Schedule } from '@/types'
import { useUnits } from '@/hooks/useUnits'
import { useIsMobile } from '@/hooks/useIsMobile'
import { DeleteConfirmSheet, BottomSheet, DataList, type DataListRow } from '@/components/ui'
import { locksHorizontal, settlesOpen, tracksPointer, type SwipePoint } from '@/utils/swipeGesture'
import { toScheduleRow } from './scheduleRow'
import { useSwipeOpenRow } from './swipeOpenRowContext'
import { buildScheduleTitle } from '../../../../functions/src/scheduleRules'
import styles from './ScheduleItem.module.scss'

// Fix 2 (controller ruling): this used to build its own, fifth title format
// (`와드 방문 - X` / `접견 - X` / `모임 - X`) — the same shared rule the row,
// Google Calendar sync, Kakao and the ICS feed already use now drives the
// "add to my calendar" link too, so what a user creates from this button
// matches what they see everywhere else.
function buildGCalUrl(schedule: Schedule, unitName: string, wardLabel?: string): string {
  const title = buildScheduleTitle({
    type: schedule.type,
    unitName,
    wardName: wardLabel ?? schedule.wardName ?? undefined,
    targetKind: schedule.targetKind ?? null,
    customTitle: schedule.customTitle ?? null,
  })
  const start = `${schedule.date.replace(/-/g, '')}T${schedule.startTime.replace(':', '')}00`
  const end = `${schedule.date.replace(/-/g, '')}T${schedule.endTime.replace(':', '')}00`
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}` })
  // Use the schedule's own location when it has one; never invent one for
  // this URL (no derivation via buildScheduleLocation).
  const location = schedule.location?.trim()
  if (location) params.set('location', location)
  return `https://calendar.google.com/calendar/render?${params}`
}

function NotesContent({ text }: { text: string }) {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const url = match[0]
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.notesLink}
      >
        {url}
      </a>,
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
  const { getWardName } = useUnits()
  const isMobile = useIsMobile()

  // 스와이프로 드러나는 액션. 목록에서 열린 행은 하나뿐이므로 열림 상태는 바깥이 갖는다.
  const swipe = useSwipeOpenRow(schedule.id)
  // 액션이 없는 행(공개 목록 등)은 열 것이 없다. 편집 권한도 없으면 마찬가지다.
  const canSwipe = swipe.enabled && isMobile && canEdit && (!!onEdit || !!onDelete)

  // 행은 손가락을 따라 실시간으로 움직인다. 뗄 때 한 번 판정해서 열면, 미는 동안
  // 화면이 죽은 것처럼 보이다가 갑자기 튀어 "반응이 없다"고 느껴진다.
  const swipeStart = useRef<SwipePoint | null>(null)
  const dragLocked = useRef(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [dragX, setDragX] = useState<number | null>(null)
  // 드러날 폭은 CSS와 글자 길이가 정한다(수정/삭제 vs Edit/Delete) — 재서 쓴다.
  const [actionsWidth, setActionsWidth] = useState(0)

  useEffect(() => {
    if (!canSwipe) return
    const measure = () => setActionsWidth(actionsRef.current?.offsetWidth ?? 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [canSwipe])

  const endDrag = () => {
    swipeStart.current = null
    dragLocked.current = false
    setDragX(null)
  }

  const handleSwipeDown = (e: React.PointerEvent) => {
    if (!canSwipe || !tracksPointer(e.pointerType)) return
    swipeStart.current = { x: e.clientX, y: e.clientY }
    dragLocked.current = false
  }

  const handleSwipeMove = (e: React.PointerEvent) => {
    const start = swipeStart.current
    if (!canSwipe || !start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    if (!dragLocked.current) {
      if (!locksHorizontal(dx, dy)) {
        // 세로로 더 갔으면 스크롤이다 — 이 제스처는 브라우저에 넘기고 손을 뗀다.
        if (Math.abs(dy) > Math.abs(dx)) swipeStart.current = null
        return
      }
      dragLocked.current = true
      // 손가락이 행 밖으로 나가도 계속 따라오게 한다. jsdom에는 없는 API라 가드한다.
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }

    const base = swipe.isOpen ? -actionsWidth : 0
    // 닫힌 상태에서 오른쪽으로, 열린 상태에서 왼쪽으로 더 끌리지 않게 가둔다.
    setDragX(Math.max(-actionsWidth, Math.min(0, base + dx)))
  }

  const handleSwipeUp = () => {
    if (!canSwipe || !dragLocked.current) {
      endDrag()
      return
    }
    // 끌던 손의 마지막 위치가 곧 답이다 — 절반을 넘겼으면 연다.
    if (settlesOpen(dragX ?? 0, actionsWidth)) swipe.open()
    else swipe.close()
    endDrag()
  }
  const [menuOpen, setMenuOpen] = useState(false)
  // lazy-mount flag so closed rows don't each carry a hidden portal
  const [sheetEverOpen, setSheetEverOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen || isMobile) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuOpen, isMobile])

  const isVisit = schedule.type === 'ward_visit'
  const isMeeting = schedule.type === 'meeting'
  const isAttendance = schedule.type === 'general_attendance'
  const date = dayjs(schedule.date)
  const isPast = past ?? date.isBefore(dayjs(), 'day')
  const hasNotes = !!schedule.notes?.trim()
  const deleteDescription = schedule.customTitle ?? unitName
  const wardLabel = schedule.wardName ? getWardName(schedule.wardName) : undefined

  const typeIcon = isVisit ? (
    <MapPin size={11} />
  ) : isMeeting ? (
    <Coffee size={11} />
  ) : isAttendance ? (
    <Building2 size={11} />
  ) : (
    <Users size={11} />
  )
  const typeIconClass = isVisit
    ? styles.typeBadgeVisit
    : isMeeting
      ? styles.typeBadgeMeeting
      : isAttendance
        ? styles.typeBadgeAttendance
        : styles.typeBadgeInterview

  const badges = (
    <>
      <span className={clsx(styles.typeBadge, typeIconClass)}>{typeIcon}</span>
      {isAttendance && (
        <span className={styles.verifiedBadge} aria-label={t('schedule.attendanceVerified')}>
          <Check size={9} strokeWidth={3.5} />
        </span>
      )}
      {isVisit && schedule.presidentAccompanied && (
        <span className={styles.presidentBadge} title={t('schedule.presidentAccompanied')}>
          <UserCheck size={11} />
          <span className={styles.presidentBadgeText}>
            {t('schedule.presidentAccompaniedShort')}
          </span>
        </span>
      )}
      {isPast && (
        <span className={styles.pastBadge}>
          <Check size={10} strokeWidth={2.5} />
          <span className={styles.pastBadgeText}>{t('common.complete')}</span>
        </span>
      )}
    </>
  )

  const actions = (
    <>
      {schedule.zoomLink && (
        <a
          href={schedule.zoomLink}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.zoomLink}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('schedule.joinZoom')}
        >
          <Video size={11} />
          <span className={styles.zoomLinkText}>Zoom</span>
        </a>
      )}

      {hasNotes && (
        <button
          type="button"
          className={clsx(styles.notesBtn, notesOpen && styles.notesBtnOpen)}
          onClick={(e) => {
            e.stopPropagation()
            setNotesOpen((v) => !v)
          }}
          title={t('schedule.notesToggle')}
          aria-expanded={notesOpen}
        >
          {notesOpen ? <ChevronUp size={14} /> : <FileText size={14} />}
        </button>
      )}

      {showCalendarAdd && !isPast && (
        <a
          href={buildGCalUrl(schedule, unitName, wardLabel)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.calendarAddBtn}
          title={t('schedule.addToMyCalendar')}
        >
          <CalendarPlus size={15} />
        </a>
      )}

      {canEdit && (
        <div className={styles.kebabWrapper}>
          <button
            ref={btnRef}
            type="button"
            className={styles.kebabBtn}
            onClick={(e) => {
              e.stopPropagation()
              if (isMobile) {
                setSheetEverOpen(true)
                setMenuOpen((prev) => !prev)
                return
              }
              if (!menuOpen && btnRef.current) {
                const rect = btnRef.current.getBoundingClientRect()
                setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
              }
              setMenuOpen((prev) => !prev)
            }}
            aria-label={t('common.more')}
          >
            <MoreVertical size={16} />
          </button>
          {!isMobile && menuOpen && menuPos && (
            <>
              <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu} style={{ top: menuPos.top, right: menuPos.right }}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit?.()
                  }}
                >
                  {t('common.edit')}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    className={styles.deleteMenuItem}
                    onClick={() => {
                      setMenuOpen(false)
                      setShowDeleteConfirm(true)
                    }}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </>
          )}
          {isMobile && (sheetEverOpen || menuOpen) && (
            // mobile: actions in a bottom sheet instead of a scroll-fragile popover
            <BottomSheet
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              title={deleteDescription}
            >
              <div className={styles.sheetActions}>
                <button
                  type="button"
                  className={styles.sheetActionBtn}
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit?.()
                  }}
                >
                  {t('common.edit')}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    className={clsx(styles.sheetActionBtn, styles.sheetActionDanger)}
                    onClick={() => {
                      setMenuOpen(false)
                      setShowDeleteConfirm(true)
                    }}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </BottomSheet>
          )}
        </div>
      )}
    </>
  )

  const row: DataListRow = {
    ...toScheduleRow({ schedule, unitName, wardLabel, today: dayjs().format('YYYY-MM-DD'), t }),
    dimmed: isPast,
    badges,
    actions,
  }

  return (
    <>
      <div className={styles.wrapper}>
        {/* 드러나는 액션은 행 "뒤"에 깔려 있고, 행이 왼쪽으로 밀리면서 보인다.
            버튼이 실제 DOM에 늘 있으므로 열기 전에는 aria-hidden으로 감춰
            스크린 리더가 목록마다 안 보이는 버튼 두 개를 읽지 않게 한다. */}
        {canSwipe && (
          <div ref={actionsRef} className={styles.swipeActions} aria-hidden={!swipe.isOpen}>
            {onEdit && (
              <button
                type="button"
                className={styles.swipeActionBtn}
                tabIndex={swipe.isOpen ? 0 : -1}
                onClick={() => {
                  swipe.close()
                  onEdit()
                }}
              >
                {t('common.edit')}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={clsx(styles.swipeActionBtn, styles.swipeActionDanger)}
                tabIndex={swipe.isOpen ? 0 : -1}
                onClick={() => {
                  // ⋯ 메뉴의 삭제와 같은 확인을 거친다 — 같은 동작이 경로에 따라
                  // 다른 안전장치를 가지면 언젠가 반드시 사고가 난다.
                  swipe.close()
                  setShowDeleteConfirm(true)
                }}
              >
                {t('common.delete')}
              </button>
            )}
          </div>
        )}

        <div
          className={clsx(styles.swipeTrack, canSwipe && swipe.isOpen && styles.swipeTrackOpen)}
          style={
            canSwipe
              ? {
                  // 끄는 동안은 손가락 위치를 그대로 쓴다. 전환 애니메이션을 끄지 않으면
                  // 행이 손보다 한 박자 늦게 따라와 미끄러지는 느낌이 난다.
                  ...(dragX !== null
                    ? { transform: `translateX(${dragX}px)`, transition: 'none' }
                    : null),
                  // 열린 위치는 잰 폭으로 정한다 — 라벨이 길어져도 잘리지 않는다.
                  ...(actionsWidth ? { '--swipe-open-width': `${actionsWidth}px` } : null),
                } as React.CSSProperties
              : undefined
          }
          onPointerDown={handleSwipeDown}
          onPointerMove={handleSwipeMove}
          onPointerUp={handleSwipeUp}
          onPointerCancel={handleSwipeUp}
          // 열린 행 위를 탭하면 닫기만 하고 그 탭은 행으로 넘기지 않는다 —
          // 실수로 상세가 열리지 않게.
          onClickCapture={(e) => {
            if (!canSwipe || !swipe.isOpen) return
            e.stopPropagation()
            swipe.close()
          }}
        >
          <DataList rows={[row]} aria-label={row.title} />
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
          onConfirm={() => {
            setShowDeleteConfirm(false)
            onDelete()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
