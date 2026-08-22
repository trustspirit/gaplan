import { describe, it, expect } from 'vitest'
import { buildScheduleTitle } from './scheduleTitle'
import { UNIT_NAME_MAP } from './unitNameMap'

const STAKE = 'seoul-east-stake'
const STAKE_NAME = UNIT_NAME_MAP[STAKE]

describe('buildScheduleTitle', () => {
  it('customTitle이 있으면 그대로 쓴다', () => {
    expect(
      buildScheduleTitle({ type: 'ward_visit', unitId: STAKE, customTitle: '마스터 플랜 - 서울동' }),
    ).toBe('마스터 플랜 - 서울동')
  })

  it('와드 방문은 와드를 주어로 쓴다', () => {
    expect(buildScheduleTitle({ type: 'ward_visit', unitId: STAKE, wardName: '교문 와드' })).toBe(
      '교문 와드 방문',
    )
  })

  it('와드명이 없는 방문은 단위명만 쓴다', () => {
    expect(buildScheduleTitle({ type: 'ward_visit', unitId: STAKE })).toBe(`${STAKE_NAME} 방문`)
  })

  it('스테이크 회장 접견은 회장을 밝힌다', () => {
    expect(
      buildScheduleTitle({ type: 'interview', unitId: STAKE, targetKind: 'stake_president' }),
    ).toBe(`${STAKE_NAME} 회장 접견`)
  })

  it('와드 감독 접견은 감독과 와드를 밝힌다', () => {
    expect(
      buildScheduleTitle({
        type: 'interview',
        unitId: STAKE,
        wardName: '교문 와드',
        targetKind: 'ward_bishop',
      }),
    ).toBe('교문 와드 감독 접견')
  })

  it('접견은 접견으로 끝난다', () => {
    expect(buildScheduleTitle({ type: 'interview', unitId: STAKE })).toBe(`${STAKE_NAME} 접견`)
  })

  it('그 외 유형은 모임으로 끝난다', () => {
    expect(buildScheduleTitle({ type: 'meeting', unitId: STAKE })).toBe(`${STAKE_NAME} 모임`)
  })

  it('단위를 알 수 없으면 모임만 남긴다', () => {
    expect(buildScheduleTitle({ type: 'meeting' })).toBe('모임')
  })

  it('표에 없는 unitId는 id를 그대로 쓴다', () => {
    expect(buildScheduleTitle({ type: 'meeting', unitId: 'unknown-unit' })).toBe('unknown-unit 모임')
  })
})
