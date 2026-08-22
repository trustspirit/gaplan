import { describe, it, expect } from 'vitest'
import { buildScheduleTitle } from './scheduleRules'

const STAKE = '서울동 스테이크'

describe('buildScheduleTitle', () => {
  it('customTitle이 있으면 그대로 쓴다', () => {
    expect(
      buildScheduleTitle({ type: 'ward_visit', unitName: STAKE, customTitle: '마스터 플랜 - 서울동' }),
    ).toBe('마스터 플랜 - 서울동')
  })

  // 방문의 주인공은 와드다. 스테이크 이름은 장소·부제가 따로 말한다.
  it('와드 방문은 와드를 주어로 쓴다', () => {
    expect(buildScheduleTitle({ type: 'ward_visit', unitName: STAKE, wardName: '교문 와드' })).toBe(
      '교문 와드 방문',
    )
  })

  it('와드를 모르는 방문은 단위명으로 물러난다', () => {
    expect(buildScheduleTitle({ type: 'ward_visit', unitName: STAKE })).toBe('서울동 스테이크 방문')
  })

  // 접견은 '누구를' 만나는지가 핵심이다 — 대상 유형이 그걸 안다.
  it('스테이크 회장 접견은 회장을 밝힌다', () => {
    expect(
      buildScheduleTitle({ type: 'interview', unitName: STAKE, targetKind: 'stake_president' }),
    ).toBe('서울동 스테이크 회장 접견')
  })

  it('와드 감독 접견은 감독과 와드를 밝힌다', () => {
    expect(
      buildScheduleTitle({
        type: 'interview',
        unitName: STAKE,
        wardName: '교문 와드',
        targetKind: 'ward_bishop',
      }),
    ).toBe('교문 와드 감독 접견')
  })

  it('대상 유형을 모르는 접견은 단위명만 쓴다', () => {
    expect(buildScheduleTitle({ type: 'interview', unitName: STAKE })).toBe('서울동 스테이크 접견')
  })

  it('사전 준비 모임은 어느 방문의 준비인지 말한다', () => {
    expect(
      buildScheduleTitle({ type: 'meeting', unitName: STAKE, preVisitWardName: '교문 와드' }),
    ).toBe('교문 와드 방문 사전 모임')
  })

  it('협의 평의회는 CC 이름을 쓴다', () => {
    expect(
      buildScheduleTitle({ type: 'meeting', targetKind: 'cc_council', ccName: '서울 CC' }),
    ).toBe('서울 CC 협의 평의회')
  })

  it('그 외 모임은 단위명 + 모임', () => {
    expect(buildScheduleTitle({ type: 'meeting', unitName: STAKE })).toBe('서울동 스테이크 모임')
  })

  it('아무 이름도 없으면 종류만 남긴다', () => {
    expect(buildScheduleTitle({ type: 'meeting' })).toBe('모임')
    expect(buildScheduleTitle({ type: 'ward_visit' })).toBe('방문')
    expect(buildScheduleTitle({ type: 'interview' })).toBe('접견')
  })
})
