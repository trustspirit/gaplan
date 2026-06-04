import type { Region, Unit } from '@/types'

export interface WardUnit {
  id: string
  name: string
  type: 'ward' | 'branch'
  unitId: string   // parent stake/district id
}

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

// Wards (와드) and branches (지부) per stake/district
// Source: churchofjesuschrist.org meetinghouse locator
export const WARDS: WardUnit[] = [
  // 서울 스테이크
  { id: 'seoul-ilsan',    name: '일산 와드',    type: 'ward', unitId: 'seoul-stake' },
  { id: 'seoul-nowon',    name: '노원 와드',    type: 'ward', unitId: 'seoul-stake' },
  { id: 'seoul-bakmun',   name: '박문 와드',    type: 'ward', unitId: 'seoul-stake' },
  { id: 'seoul-uijeongbu',name: '의정부 와드',  type: 'ward', unitId: 'seoul-stake' },
  { id: 'seoul-chuncheon',name: '춘천 와드',    type: 'ward', unitId: 'seoul-stake' },
  // 서울동 스테이크
  { id: 'seoul-east-gangbuk1', name: '강북1 와드', type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-gangbuk2', name: '강북2 와드', type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-gyomun',   name: '교문 와드',  type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-dongdaemun', name: '동대문 와드', type: 'ward', unitId: 'seoul-east-stake' },
  // 서울서 스테이크
  { id: 'seoul-west-yeongdeungpo', name: '영등포 와드', type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-bucheon',      name: '부천 와드',   type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-incheon1',     name: '인천1 와드',  type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-incheon2',     name: '인천2 와드',  type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-cheongna',     name: '청라 와드',   type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-gimpo',        name: '김포 와드',   type: 'ward', unitId: 'seoul-west-stake' },
  // 경기 스테이크
  { id: 'gyeonggi-suji',     name: '수지 와드',   type: 'ward', unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-singal',   name: '신갈 와드',   type: 'ward', unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-sinpung',  name: '신풍 와드',   type: 'ward', unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-gobanjung',name: '곡반정 와드', type: 'ward', unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-bundang',  name: '분당 와드',   type: 'ward', unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-ansan',    name: '안산 와드',   type: 'ward', unitId: 'gyeonggi-stake' },
  // 서울남 스테이크
  { id: 'seoul-south-anyang', name: '안양 와드', type: 'ward', unitId: 'seoul-south-stake' },
  { id: 'seoul-south-sadang', name: '사당 와드', type: 'ward', unitId: 'seoul-south-stake' },
  { id: 'seoul-south-geumcheon', name: '금천 와드', type: 'ward', unitId: 'seoul-south-stake' },
  { id: 'seoul-south-sirim',  name: '신림 와드', type: 'ward', unitId: 'seoul-south-stake' },
  { id: 'seoul-south-sangdo', name: '상도 와드', type: 'ward', unitId: 'seoul-south-stake' },
  // 대전 스테이크
  { id: 'daejeon-1',    name: '대전1 와드', type: 'ward', unitId: 'daejeon-stake' },
  { id: 'daejeon-2',    name: '대전2 와드', type: 'ward', unitId: 'daejeon-stake' },
  { id: 'daejeon-chungnam', name: '충남 와드',  type: 'ward', unitId: 'daejeon-stake' },
  // 청주 스테이크
  { id: 'cheongju-heungdeok', name: '흥덕 와드', type: 'ward', unitId: 'cheongju-stake' },
  { id: 'cheongju-sangdang',  name: '상당 와드', type: 'ward', unitId: 'cheongju-stake' },
  // 전주 스테이크
  { id: 'jeonju-wansan',  name: '완산 와드', type: 'ward', unitId: 'jeonju-stake' },
  { id: 'jeonju-gunsan',  name: '군산 와드', type: 'ward', unitId: 'jeonju-stake' },
  { id: 'jeonju-iksan',   name: '익산 와드', type: 'ward', unitId: 'jeonju-stake' },
  // 광주 스테이크
  { id: 'gwangju-jungjang', name: '중장 와드', type: 'ward', unitId: 'gwangju-stake' },
  { id: 'gwangju-nongseong', name: '농성 와드', type: 'ward', unitId: 'gwangju-stake' },
  { id: 'gwangju-cheomdan', name: '첨단 와드', type: 'ward', unitId: 'gwangju-stake' },
  // 부산 스테이크
  { id: 'busan-oncheon',   name: '온천 와드',  type: 'ward', unitId: 'busan-stake' },
  { id: 'busan-geumjeong', name: '금정 와드',  type: 'ward', unitId: 'busan-stake' },
  { id: 'busan-haeundae',  name: '해운대 와드', type: 'ward', unitId: 'busan-stake' },
  { id: 'busan-dongrae',   name: '동래 와드',  type: 'ward', unitId: 'busan-stake' },
  { id: 'busan-jungang',   name: '중앙 와드',  type: 'ward', unitId: 'busan-stake' },
  // 대구 스테이크
  { id: 'daegu-suseong',   name: '수성 와드',  type: 'ward', unitId: 'daegu-stake' },
  { id: 'daegu-jungni',    name: '중리 와드',  type: 'ward', unitId: 'daegu-stake' },
  { id: 'daegu-dongdaegu', name: '동대구 와드', type: 'ward', unitId: 'daegu-stake' },
  { id: 'daegu-chilgok',   name: '칠곡 와드',  type: 'ward', unitId: 'daegu-stake' },
  // 창원 스테이크
  { id: 'changwon-masan',      name: '마산 와드',  type: 'ward', unitId: 'changwon-stake' },
  { id: 'changwon-jinhae',     name: '진해 와드',  type: 'ward', unitId: 'changwon-stake' },
  { id: 'changwon-changwon',   name: '창원 와드',  type: 'ward', unitId: 'changwon-stake' },
  { id: 'changwon-samcheonpo', name: '삼천포 와드', type: 'ward', unitId: 'changwon-stake' },
  // 울산 지방부
  { id: 'ulsan-branch',   name: '울산 지부', type: 'branch', unitId: 'ulsan-district' },
  { id: 'gyeongju-branch', name: '경주 지부', type: 'branch', unitId: 'ulsan-district' },
]

export const getWardsByUnit = (unitId: string): WardUnit[] =>
  WARDS.filter(w => w.unitId === unitId)
