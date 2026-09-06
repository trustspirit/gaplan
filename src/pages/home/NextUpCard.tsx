import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { Video } from 'lucide-react'
import type { Schedule } from '@/types'
import { Card, CardBody } from '@/components/ui'
import { scheduleSubtitle } from '@/utils/scheduleSubtitle'
import { buildScheduleTitle } from '../../../functions/src/scheduleRules'
import { relativeWhen } from './nextUpTiming'
import styles from './HomePage.module.scss'

export interface NextUpCardProps {
  schedule: Schedule
  /** 이미 해석된 표시 이름. 이 조각은 id→이름을 풀지 않는다(ScheduleItem과 같은 계약). */
  unitName: string
  /** 와드 이름의 로케일 표시형. 호출부가 useUnits().getWardName으로 풀어 넘긴다. */
  wardLabel?: string
  /** 'YYYY-MM-DDTHH:mm'. 호출자가 넘겨 테스트가 시계에 매이지 않게 한다. */
  now: string
}

/** 한 시간 안이면 분으로, 그보다 멀면 시간으로 센다 — "97분 뒤"는 사람이 읽는 단위가 아니다. */
const MINUTES_IN_HOUR = 60

/**
 * 홈 맨 위의 「다음 일정」 하나.
 *
 * 아래 목록이 답하지 못하던 질문 하나만 답한다: 지금 무엇을 향해 가고 있는가.
 * 그래서 담는 것도 그것뿐이다 — 언제, 무엇을, 어디 소속으로, (온라인이면) 어디로 들어가는지.
 * 노트·수정·삭제는 아래 목록과 상세가 이미 갖고 있으므로 여기서 되풀이하지 않는다.
 */
export function NextUpCard({ schedule, unitName, wardLabel, now }: NextUpCardProps) {
  const { t } = useTranslation()
  const when = relativeWhen(schedule.date, schedule.startTime, now)

  const title = buildScheduleTitle({
    type: schedule.type,
    unitName,
    wardName: wardLabel ?? schedule.wardName ?? undefined,
    targetKind: schedule.targetKind ?? null,
    customTitle: schedule.customTitle ?? null,
  })

  // 제목이 이미 소속을 말하고 있으면 아래에서 되풀이하지 않는다 — 목록 행이 쓰는
  // 규칙을 그대로 공유한다.
  const subtitle = scheduleSubtitle({ schedule, title, unitName, wardLabel })

  // 붙여넣은 값이 그대로 href가 되면 javascript: 스킴이 실행된다 — 공개 일정 페이지가
  // 쓰는 것과 같은 가드다.
  const safeZoom =
    schedule.zoomLink && /^https?:\/\//i.test(schedule.zoomLink) ? schedule.zoomLink : null

  const whenLabel =
    when.day === 'today'
      ? t('home.nextUpToday', { time: schedule.startTime })
      : when.day === 'tomorrow'
        ? t('home.nextUpTomorrow', { time: schedule.startTime })
        : t('home.nextUpDday', {
            count: when.daysUntil,
            date: dayjs(schedule.date).format('M/D'),
            time: schedule.startTime,
          })

  // 시작했으면 남은 시간을 세지 않는다 — 음수 분을 보여주느니 진행 중이라고 말한다.
  const countdown =
    when.day !== 'today' || when.minutesUntil <= 0
      ? when.day === 'today'
        ? t('home.nextUpNow')
        : null
      : when.minutesUntil < MINUTES_IN_HOUR
        ? t('home.nextUpInMinutes', { count: when.minutesUntil })
        : t('home.nextUpInHours', { count: Math.round(when.minutesUntil / MINUTES_IN_HOUR) })

  return (
    <Card className={styles.nextUpCard}>
      <CardBody className={styles.nextUpBody}>
        <p className={styles.nextUpLabel}>{t('home.nextUp')}</p>
        <p className={styles.nextUpWhen}>
          <span className={styles.nextUpWhenPrimary}>{whenLabel}</span>
          {countdown && <span className={styles.nextUpCountdown}>{countdown}</span>}
        </p>
        <p className={styles.nextUpTitle}>{title}</p>
        <div className={styles.nextUpMeta}>
          {subtitle && <span className={styles.nextUpUnit}>{subtitle}</span>}
          {safeZoom && (
            <a
              href={safeZoom}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.nextUpZoom}
            >
              <Video size={13} />
              {t('schedule.joinZoom')}
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
