import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { Schedule } from '@/types'
import { SWIPE_THRESHOLD_PX } from '@/utils/swipeGesture'

const { isMobileMock } = vi.hoisted(() => ({ isMobileMock: vi.fn(() => true) }))

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => isMobileMock() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('@/hooks/useUnits', () => ({
  useUnits: () => ({ getUnitName: (id: string) => id, getWardName: (n: string) => n }),
}))

import { ScheduleItem } from './ScheduleItem'
import { SwipeOpenRowProvider } from './swipeOpenRow'

const schedule = (over: Partial<Schedule> = {}): Schedule => ({
  id: 's1',
  type: 'ward_visit',
  seventyUid: 'sv',
  unitId: 'u1',
  presidentUid: null,
  date: '2099-01-10',
  startTime: '10:00',
  endTime: '11:00',
  status: 'confirmed',
  createdBy: 'a',
  ...over,
})

/** pointerdown → pointerup 한 쌍으로 스와이프를 흉내낸다. */
function swipe(el: Element, dx: number, dy = 0, pointerType = 'touch') {
  fireEvent.pointerDown(el, { clientX: 200, clientY: 100, pointerType })
  fireEvent.pointerUp(el, { clientX: 200 + dx, clientY: 100 + dy, pointerType })
}

function track(container: HTMLElement) {
  // 스와이프를 받는 요소 — DataList를 감싼 트랙.
  const el = container.querySelector('[class*="swipeTrack"]')
  if (!el) throw new Error('swipe track not found')
  return el
}

function renderRows(rows: Schedule[], props: Record<string, unknown> = {}) {
  return render(
    <SwipeOpenRowProvider>
      {rows.map((s) => (
        <ScheduleItem
          key={s.id}
          schedule={s}
          unitName="u1"
          canEdit
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          {...props}
        />
      ))}
    </SwipeOpenRowProvider>,
  )
}

beforeEach(() => {
  isMobileMock.mockReturnValue(true)
})

describe('ScheduleItem 스와이프 액션', () => {
  it('왼쪽으로 밀면 수정·삭제가 드러난다', () => {
    const { container } = renderRows([schedule()])
    const actions = container.querySelector('[class*="swipeActions"]')!

    expect(actions).toHaveAttribute('aria-hidden', 'true')
    swipe(track(container), -SWIPE_THRESHOLD_PX)
    expect(actions).not.toHaveAttribute('aria-hidden', 'true')
    expect(within(actions as HTMLElement).getByText('common.edit')).toBeInTheDocument()
    expect(within(actions as HTMLElement).getByText('common.delete')).toBeInTheDocument()
  })

  it('오른쪽으로 되밀면 닫힌다', () => {
    const { container } = renderRows([schedule()])
    const actions = container.querySelector('[class*="swipeActions"]')!

    swipe(track(container), -SWIPE_THRESHOLD_PX)
    expect(actions).not.toHaveAttribute('aria-hidden', 'true')
    swipe(track(container), SWIPE_THRESHOLD_PX)
    expect(actions).toHaveAttribute('aria-hidden', 'true')
  })

  // 두 행이 동시에 열려 있으면 어느 쪽 버튼인지 눈이 헷갈린다.
  it('다른 행을 열면 앞서 열린 행이 닫힌다', () => {
    const { container } = renderRows([schedule({ id: 'a' }), schedule({ id: 'b' })])
    const tracks = container.querySelectorAll('[class*="swipeTrack"]')
    const actions = container.querySelectorAll('[class*="swipeActions"]')

    swipe(tracks[0], -SWIPE_THRESHOLD_PX)
    expect(actions[0]).not.toHaveAttribute('aria-hidden', 'true')

    swipe(tracks[1], -SWIPE_THRESHOLD_PX)
    expect(actions[0]).toHaveAttribute('aria-hidden', 'true')
    expect(actions[1]).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('임계값에 못 미치는 탭은 열지 않는다', () => {
    const { container } = renderRows([schedule()])
    const actions = container.querySelector('[class*="swipeActions"]')!

    swipe(track(container), -(SWIPE_THRESHOLD_PX - 1))
    expect(actions).toHaveAttribute('aria-hidden', 'true')
  })

  it('세로로 크게 움직이면 열지 않는다 — 스크롤이 행을 열면 안 된다', () => {
    const { container } = renderRows([schedule()])
    const actions = container.querySelector('[class*="swipeActions"]')!

    swipe(track(container), -60, 60)
    expect(actions).toHaveAttribute('aria-hidden', 'true')
  })

  it('마우스 드래그로는 열리지 않는다', () => {
    const { container } = renderRows([schedule()])
    const actions = container.querySelector('[class*="swipeActions"]')!

    swipe(track(container), -SWIPE_THRESHOLD_PX, 0, 'mouse')
    expect(actions).toHaveAttribute('aria-hidden', 'true')
  })

  it('데스크톱에서는 스와이프 트랙 자체가 동작하지 않는다', () => {
    isMobileMock.mockReturnValue(false)
    const { container } = renderRows([schedule()])
    expect(container.querySelector('[class*="swipeActions"]')).toBeNull()
  })

  // ⋯ 메뉴는 스와이프를 못 쓰는 사람의 유일한 경로다. 스와이프가 그걸 대체하면 안 된다.
  it('스와이프를 넣어도 ⋯ 버튼은 그대로 있다', () => {
    renderRows([schedule()])
    expect(screen.getByRole('button', { name: 'common.more' })).toBeInTheDocument()
  })

  // ⋯ → 삭제와 스와이프 → 삭제가 다른 안전장치를 가지면 언젠가 사고가 난다.
  it('스와이프에서 삭제를 눌러도 곧바로 지우지 않고 확인을 거친다', () => {
    const onDelete = vi.fn()
    const { container } = renderRows([schedule()], { onDelete })

    swipe(track(container), -SWIPE_THRESHOLD_PX)
    const actions = container.querySelector('[class*="swipeActions"]') as HTMLElement
    fireEvent.click(within(actions).getByText('common.delete'))

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('편집 권한이 없으면 스와이프 액션이 없다', () => {
    const { container } = render(
      <SwipeOpenRowProvider>
        <ScheduleItem schedule={schedule()} unitName="u1" />
      </SwipeOpenRowProvider>,
    )
    expect(container.querySelector('[class*="swipeActions"]')).toBeNull()
  })

  // 스와이프를 안 쓰는 목록(공개 페이지 등)은 Provider를 감싸지 않는다.
  it('Provider 없이도 행은 그냥 그려진다', () => {
    const { container } = render(
      <ScheduleItem schedule={schedule()} unitName="u1" canEdit onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(container.querySelector('[class*="swipeActions"]')).toBeNull()
  })
})
