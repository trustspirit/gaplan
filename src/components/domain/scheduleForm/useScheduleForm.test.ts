import { renderHook, act } from '@testing-library/react'
import { useScheduleForm } from './useScheduleForm'

describe('useScheduleForm', () => {
  it('아무것도 안 건드리면 dirty가 아니다', () => {
    const { result } = renderHook(() => useScheduleForm())
    expect(result.current.isDirty).toBe(false)
  })

  // 새로 생긴 칸이 dirty 검사에서 빠지면, 실수로 배경을 탭했을 때 경고 없이 입력이 날아간다.
  it('장소만 채워도 dirty다', () => {
    const { result } = renderHook(() => useScheduleForm())
    act(() => result.current.set('location', '스테이크 센터'))
    expect(result.current.isDirty).toBe(true)
  })

  it('초기값과 같은 값으로 되돌리면 dirty가 풀린다', () => {
    const { result } = renderHook(() => useScheduleForm({ date: '2026-09-01' }))
    act(() => result.current.set('date', '2026-09-02'))
    expect(result.current.isDirty).toBe(true)
    act(() => result.current.set('date', '2026-09-01'))
    expect(result.current.isDirty).toBe(false)
  })

  // 대상 유형 변경은 Task 1의 규칙을 그대로 따라야 한다 — 훅이 제 나름의 리셋을 하면 규칙이 둘이 된다.
  it('대상 유형을 협의 평의회로 바꾸면 스테이크·와드가 지워진다', () => {
    const { result } = renderHook(() => useScheduleForm())
    act(() => result.current.setTargetKind('ward_bishop'))
    act(() => result.current.set('target', { ...result.current.state.target, unitId: 'seoul-east-stake', wardName: '교문 와드' }))
    act(() => result.current.setTargetKind('cc_council'))
    expect(result.current.state.target.unitId).toBe('')
    expect(result.current.state.target.wardName).toBe('')
  })

  it('종류를 바꾸면 대상과 목적이 초기화된다', () => {
    const { result } = renderHook(() => useScheduleForm())
    act(() => result.current.setTargetKind('ward_bishop'))
    act(() => result.current.set('purpose', 'pre_visit'))
    act(() => result.current.setType('ward_visit'))
    expect(result.current.state.target.kind).toBe('')
    expect(result.current.state.purpose).toBe('general')
  })

  // 날짜·시간은 종류와 무관하다. 종류를 바꿨다고 사용자가 이미 고른 날짜를 빼앗지 않는다.
  it('종류를 바꿔도 날짜와 시간은 남는다', () => {
    const { result } = renderHook(() => useScheduleForm())
    act(() => result.current.set('date', '2026-09-01'))
    act(() => result.current.set('startTime', '10:00'))
    act(() => result.current.setType('meeting'))
    expect(result.current.state.date).toBe('2026-09-01')
    expect(result.current.state.startTime).toBe('10:00')
  })
})
