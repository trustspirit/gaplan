import { describe, it, expect, beforeEach } from 'vitest'
import { readInlinePublicData } from './inlinePublicData'

// 서버가 심는 태그 id와 같아야 한다. 어긋나면 아무 테스트도 안 깨진 채로 인라인
// 데이터가 조용히 무시되고, 속도만 예전으로 돌아간다 — 그래서 값을 직접 물어본다.
// (클라이언트가 functions/src를 import하는 건 이 저장소의 기존 패턴이다:
//  ScheduleItem·EditScheduleModal이 scheduleRules를 같은 방식으로 쓴다.)
import { INLINE_DATA_ID } from '../../functions/src/publicInlineScript'

const ID = '__public_data__'

function plant(content: string) {
  const el = document.createElement('script')
  el.type = 'application/json'
  el.id = ID
  el.textContent = content
  document.head.appendChild(el)
}

describe('readInlinePublicData', () => {
  beforeEach(() => {
    document.getElementById(ID)?.remove()
  })

  it('서버가 쓰는 태그 id와 같은 값을 본다', () => {
    expect(INLINE_DATA_ID).toBe(ID)
  })

  it('태그가 없으면 null', () => {
    expect(readInlinePublicData('tok')).toBeNull()
  })

  it('깨진 JSON이면 null이고 태그를 지운다', () => {
    plant('{not json')
    expect(readInlinePublicData('tok')).toBeNull()
    expect(document.getElementById(ID)).toBeNull()
  })

  // CDN이나 뒤로가기 복원이 다른 토큰의 문서를 내줄 수 있다 — 그 데이터를 쓰면
  // 사용자가 볼 권한이 없는 일정이 화면에 뜬다.
  it('다른 토큰의 데이터면 null', () => {
    plant(JSON.stringify({ token: 'other', data: { schedules: [] } }))
    expect(readInlinePublicData('tok')).toBeNull()
  })

  it('schedules 배열이 없으면 null — 스키마가 어긋난 것', () => {
    plant(JSON.stringify({ token: 'tok', data: { scopeDisplayName: 'x' } }))
    expect(readInlinePublicData('tok')).toBeNull()
  })

  it('정상이면 파싱해 돌려주고 태그를 지운다', () => {
    plant(
      JSON.stringify({
        token: 'tok',
        data: {
          schedules: [{ id: 's1', date: '2026-09-10' }],
          generalSchedules: [],
          scopeDisplayName: '서울 CC',
        },
      }),
    )
    expect(readInlinePublicData('tok')).toEqual({
      schedules: [{ id: 's1', date: '2026-09-10' }],
      generalSchedules: [],
      scopeDisplayName: '서울 CC',
    })
    expect(document.getElementById(ID)).toBeNull()
  })

  it('빠진 선택 필드는 기본값으로 채운다', () => {
    plant(JSON.stringify({ token: 'tok', data: { schedules: [] } }))
    expect(readInlinePublicData('tok')).toEqual({
      schedules: [],
      generalSchedules: [],
      scopeDisplayName: null,
    })
  })
})
