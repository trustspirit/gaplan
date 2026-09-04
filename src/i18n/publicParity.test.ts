import { describe, it, expect } from 'vitest'
import koPublic from './public/ko.json'
import enPublic from './public/en.json'
import ko from './ko.json'
import en from './en.json'

/** PublicSchedulePage가 실제로 부르는 키. 페이지에서 t()를 추가·삭제하면 여기도 고친다. */
const USED = [
  'public.title',
  'public.scopedTitle',
  'public.subscribeLabel',
  'public.appleCalendar',
  'public.googleCalendar',
  'public.outlookCalendar',
  'public.outlookPersonal',
  'public.outlookWork',
  'public.loading',
  'public.empty',
  'public.privateError',
  'public.fetchError',
  'public.typeVisit',
  'public.typeInterview',
  'public.typeMeeting',
  'public.todayMarker',
  'public.pastBadge',
  'public.refresh',
  'public.retry',
  'public.presidentAccompanied',
]

function get(dict: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], dict)
}

describe('공개 사전', () => {
  it('ko와 en의 키 집합이 같다', () => {
    expect(Object.keys(koPublic.public).sort()).toEqual(Object.keys(enPublic.public).sort())
  })

  it.each(USED)('%s 가 ko/en 양쪽에 있다', (path) => {
    expect(get(koPublic as never, path)).toBeTruthy()
    expect(get(enPublic as never, path)).toBeTruthy()
  })

  // 공개 엔트리가 본 앱 사전을 조금이라도 참조하면 그 순간 전체(gzip 30.6 kB)가
  // 딸려 온다. public.*는 본 앱 사전에서 빠져 있어야 한다.
  it('본 앱 사전에는 public 최상위 키가 없다', () => {
    expect('public' in ko).toBe(false)
    expect('public' in en).toBe(false)
  })
})
