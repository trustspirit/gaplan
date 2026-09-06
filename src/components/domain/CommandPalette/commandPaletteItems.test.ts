import { describe, it, expect } from 'vitest'
import { filterCommandItems, type CommandItem } from './commandPaletteItems'

const items: CommandItem[] = [
  { id: 'home', label: '홈', to: '/home' },
  { id: 'schedules', label: '일정', to: '/schedules' },
  { id: 'plans', label: '계획', to: '/plans' },
  { id: 'settings', label: '설정', to: '/settings' },
]

describe('filterCommandItems', () => {
  it('질의가 비면 전부 원래 순서로 돌려준다', () => {
    expect(filterCommandItems(items, '').map((i) => i.id)).toEqual([
      'home',
      'schedules',
      'plans',
      'settings',
    ])
  })

  it('공백만 있는 질의도 비어 있는 것으로 본다', () => {
    expect(filterCommandItems(items, '   ')).toHaveLength(4)
  })

  it('라벨 부분 일치로 거른다', () => {
    expect(filterCommandItems(items, '일정').map((i) => i.id)).toEqual(['schedules'])
  })

  it('대소문자를 무시한다', () => {
    const en: CommandItem[] = [{ id: 'settings', label: 'Settings', to: '/settings' }]
    expect(filterCommandItems(en, 'SET')).toHaveLength(1)
    expect(filterCommandItems(en, 'set')).toHaveLength(1)
  })

  it('앞뒤 공백은 무시한다', () => {
    expect(filterCommandItems(items, '  일정  ').map((i) => i.id)).toEqual(['schedules'])
  })

  it('맞는 게 없으면 빈 배열', () => {
    expect(filterCommandItems(items, '없는페이지')).toEqual([])
  })

  // 걸러도 원래 순서를 지킨다 — 점수로 재정렬하면 같은 질의에 항목이 뛰어다녀서
  // 두 번째 입력할 때 손이 기억한 위치가 어긋난다.
  it('일치한 항목들 사이의 원래 순서를 지킨다', () => {
    const many: CommandItem[] = [
      { id: 'a', label: '일정 목록', to: '/a' },
      { id: 'b', label: '다른 것', to: '/b' },
      { id: 'c', label: '일정 통계', to: '/c' },
    ]
    expect(filterCommandItems(many, '일정').map((i) => i.id)).toEqual(['a', 'c'])
  })
})
