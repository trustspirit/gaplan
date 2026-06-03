import type { Region, Unit } from '@/types'

export const REGIONS: Region[] = [
  { id: 'seoul', name: '서울' },
  { id: 'seoul-south', name: '서울남' },
  { id: 'busan', name: '부산' },
]

export const UNITS_SEOUL: Omit<Unit, 'presidentUid'>[] = [
  { id: 'seoul-stake', name: '서울 스테이크', type: 'stake', regionId: 'seoul' },
  { id: 'seoul-east-stake', name: '서울동 스테이크', type: 'stake', regionId: 'seoul' },
  { id: 'seoul-west-stake', name: '서울서 스테이크', type: 'stake', regionId: 'seoul' },
  { id: 'gyeonggi-stake', name: '경기 스테이크', type: 'stake', regionId: 'seoul' },
]

export const UNITS_SEOUL_SOUTH: Omit<Unit, 'presidentUid'>[] = [
  { id: 'seoul-south-stake', name: '서울남 스테이크', type: 'stake', regionId: 'seoul-south' },
  { id: 'daejeon-stake', name: '대전 스테이크', type: 'stake', regionId: 'seoul-south' },
  { id: 'cheongju-stake', name: '청주 스테이크', type: 'stake', regionId: 'seoul-south' },
  { id: 'jeonju-stake', name: '전주 스테이크', type: 'stake', regionId: 'seoul-south' },
  { id: 'gwangju-stake', name: '광주 스테이크', type: 'stake', regionId: 'seoul-south' },
]

export const UNITS_BUSAN: Omit<Unit, 'presidentUid'>[] = [
  { id: 'busan-stake', name: '부산 스테이크', type: 'stake', regionId: 'busan' },
  { id: 'daegu-stake', name: '대구 스테이크', type: 'stake', regionId: 'busan' },
  { id: 'changwon-stake', name: '창원 스테이크', type: 'stake', regionId: 'busan' },
  { id: 'ulsan-district', name: '울산 지방부', type: 'district', regionId: 'busan' },
]

export const ALL_UNITS = [...UNITS_SEOUL, ...UNITS_SEOUL_SOUTH, ...UNITS_BUSAN]

export const getUnitsByRegion = (regionId: string) =>
  ALL_UNITS.filter(u => u.regionId === regionId)
