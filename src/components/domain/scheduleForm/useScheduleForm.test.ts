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

  // Task 7 리뷰 Finding: set()이 값이 안 바뀌었는데도 매번 새 state 객체를 만들면, 매
  // 렌더 새 참조를 돌려주는 값(예: 목 훅)에 의존하는 effect가 무한 루프에 빠질 수 있다
  // (EditScheduleModal의 relatedVisitId 복구 effect에서 실제로 재현됨). set()은 바뀐
  // 값이 없으면 이전 state 객체를 그대로 돌려줘야 한다(bail-out).
  it('바뀌지 않은 원시값으로 set()을 불러도 state 객체 참조가 그대로다', () => {
    const { result } = renderHook(() => useScheduleForm({ date: '2026-09-01' }))
    const before = result.current.state
    act(() => result.current.set('date', '2026-09-01'))
    expect(result.current.state).toBe(before)
  })

  it('바뀐 원시값으로 set()을 부르면 새 state와 새 값이 반영된다', () => {
    const { result } = renderHook(() => useScheduleForm({ date: '2026-09-01' }))
    const before = result.current.state
    act(() => result.current.set('date', '2026-09-02'))
    expect(result.current.state).not.toBe(before)
    expect(result.current.state.date).toBe('2026-09-02')
  })

  // 나중에 누군가 이 bail-out을 "최적화"해서 얕은 비교가 아니라 깊은 비교로 바꾸면, 호출부가
  // 매번 새 객체를 스프레드해서 넘기는 target 같은 필드는 값이 실제로 바뀌어도 조용히
  // 업데이트를 놓치게 된다. Object.is(원시값/참조 비교)만 써야 한다는 걸 못박는 회귀 테스트.
  it("target처럼 호출부가 매번 새 객체를 넘기는 필드는, 값이 바뀌면 그 새 객체로 그대로 갱신된다", () => {
    const { result } = renderHook(() => useScheduleForm())
    act(() => result.current.set('target', { ...result.current.state.target, unitId: 'x' }))
    expect(result.current.state.target.unitId).toBe('x')
  })

  it('바뀌지 않은 값으로 set()을 불러도 isDirty는 그대로다', () => {
    const { result } = renderHook(() => useScheduleForm({ date: '2026-09-01' }))
    expect(result.current.isDirty).toBe(false)
    act(() => result.current.set('date', '2026-09-01'))
    expect(result.current.isDirty).toBe(false)
  })
})
