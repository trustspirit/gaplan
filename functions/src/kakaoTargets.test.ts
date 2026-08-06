import { describe, it, expect } from 'vitest'
import { filterTargetSecretaries, type SecretaryDoc } from './kakaoTargets'

const SEVENTY = 'seventy-1'

const CANDIDATES: SecretaryDoc[] = [
  { uid: 'sec-a', assignedSeventyUid: SEVENTY, kakaoConnected: true },
  { uid: 'sec-b', assignedSeventyUid: 'seventy-2', kakaoConnected: true },
  { uid: 'sec-c', assignedSeventyUid: SEVENTY, kakaoConnected: false },
  { uid: 'sec-d', assignedSeventyUid: SEVENTY },
]

describe('filterTargetSecretaries', () => {
  it('담당 칠십인이 일치하고 연동된 사람만 남긴다', () => {
    expect(filterTargetSecretaries(CANDIDATES, SEVENTY)).toEqual(['sec-a'])
  })

  it('일정에 seventyUid가 없으면 빈 배열', () => {
    expect(filterTargetSecretaries(CANDIDATES, undefined)).toEqual([])
  })

  it('후보가 없으면 빈 배열', () => {
    expect(filterTargetSecretaries([], SEVENTY)).toEqual([])
  })

  it('여러 명이 담당이면 모두 남긴다', () => {
    const many: SecretaryDoc[] = [
      { uid: 'sec-a', assignedSeventyUid: SEVENTY, kakaoConnected: true },
      { uid: 'sec-e', assignedSeventyUid: SEVENTY, kakaoConnected: true },
    ]
    expect(filterTargetSecretaries(many, SEVENTY)).toEqual(['sec-a', 'sec-e'])
  })
})
