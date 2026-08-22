import { describe, it, expect } from 'vitest'
import { buildScheduleTitle, buildScheduleLocation } from './scheduleRules'

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

describe('buildScheduleLocation', () => {
  it('사용자가 쓴 값이 언제나 이긴다', () => {
    expect(
      buildScheduleLocation({
        type: 'ward_visit',
        wardName: '교문 와드',
        location: '스테이크 센터 2층',
      }),
    ).toBe('스테이크 센터 2층')
  })

  // 온라인 여부가 물리적 장소보다 먼저다 — 어디로 가야 하는지가 달라진다.
  it('Zoom 링크가 있으면 온라인이다', () => {
    expect(
      buildScheduleLocation({ type: 'meeting', unitName: '서울동 스테이크', zoomLink: 'https://zoom.us/j/1' }),
    ).toBe('온라인 (Zoom)')
  })

  it('빈 문자열 Zoom 링크는 온라인으로 치지 않는다', () => {
    expect(
      buildScheduleLocation({ type: 'meeting', unitName: '서울동 스테이크', zoomLink: '   ' }),
    ).toBe('서울동 스테이크')
  })

  it('와드 방문은 와드가 장소다', () => {
    expect(
      buildScheduleLocation({ type: 'ward_visit', unitName: '서울동 스테이크', wardName: '교문 와드' }),
    ).toBe('교문 와드')
  })

  it('와드를 모르는 방문은 단위명이 장소다', () => {
    expect(buildScheduleLocation({ type: 'ward_visit', unitName: '서울동 스테이크' })).toBe(
      '서울동 스테이크',
    )
  })

  it('협의 평의회는 CC가 장소다', () => {
    expect(
      buildScheduleLocation({ type: 'meeting', targetKind: 'cc_council', ccName: '서울 CC' }),
    ).toBe('서울 CC')
  })

  it('아무것도 모르면 null을 준다 — 표시하지 않는다', () => {
    expect(buildScheduleLocation({ type: 'meeting' })).toBeNull()
  })
})
