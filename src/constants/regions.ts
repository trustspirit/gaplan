import type { Region, Unit } from '@/types'

// Region accent colors (used for calendar chips)
export const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'seoul':       { bg: '#e8f0fe', text: '#1a56db', border: '#93b4f8' },
  'seoul-south': { bg: '#fce8f3', text: '#9d174d', border: '#f6a5c0' },
  'busan':       { bg: '#e3f9f1', text: '#046c4e', border: '#84e1bc' },
}

// Per-unit (stake/district) colors — each stake gets its own shade within the region palette
export const UNIT_COLORS: Record<string, { bg: string; text: string }> = {
  // 서울 CC — blues
  'seoul-stake':        { bg: '#dbeafe', text: '#1e40af' },
  'seoul-east-stake':   { bg: '#eff6ff', text: '#2563eb' },
  'seoul-south-stake':  { bg: '#e0e7ff', text: '#3730a3' },
  'seoul-west-stake':   { bg: '#eef2ff', text: '#4338ca' },
  'gangneung-district': { bg: '#fff7ed', text: '#9a3412' },
  'military-district':  { bg: '#f0fdf4', text: '#166534' },
  // 서울남 CC — pinks/purples
  'gyeonggi-stake':    { bg: '#fdf2f8', text: '#9d174d' },
  'daejeon-stake':     { bg: '#fce7f3', text: '#be185d' },
  'cheongju-stake':    { bg: '#f5f3ff', text: '#7c3aed' },
  'jeonju-stake':      { bg: '#ede9fe', text: '#6d28d9' },
  // 부산 CC — greens/teals
  'gwangju-stake':     { bg: '#f3e8ff', text: '#7e22ce' },
  'busan-stake':       { bg: '#ecfdf5', text: '#065f46' },
  'daegu-stake':       { bg: '#d1fae5', text: '#064e3b' },
  'changwon-stake':    { bg: '#ccfbf1', text: '#0f766e' },
  'ulsan-district':    { bg: '#cffafe', text: '#155e75' },
}

export function getUnitColor(unitId: string): { bg: string; text: string } {
  return UNIT_COLORS[unitId] ?? { bg: '#f3f4f6', text: '#374151' }
}

export function getRegionColor(regionId: string) {
  return REGION_COLORS[regionId] ?? { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
}

export interface WardUnit {
  id: string
  name: { ko: string; en: string }
  type: 'ward' | 'branch'
  unitId: string   // parent stake/district id
}

export function getUnitName(
  unit: { name: string | { ko: string; en: string } },
  lang: 'ko' | 'en' = 'ko',
): string {
  if (typeof unit.name === 'string') return unit.name
  return unit.name[lang]
}

export const REGIONS: Region[] = [
  { id: 'seoul', name: '서울 CC' },
  { id: 'seoul-south', name: '서울남 CC' },
  { id: 'busan', name: '부산 CC' },
]

// 서울 CC: 서울, 서울동, 서울남, 서울서, 강릉, 미군
export const UNITS_SEOUL: Omit<Unit, 'presidentUid'>[] = [
  { id: 'seoul-stake',        name: { ko: '서울 스테이크',   en: 'Seoul Stake' },               type: 'stake',    regionId: 'seoul' },
  { id: 'seoul-east-stake',   name: { ko: '서울동 스테이크', en: 'Seoul East Stake' },           type: 'stake',    regionId: 'seoul' },
  { id: 'seoul-south-stake',  name: { ko: '서울남 스테이크', en: 'Seoul South Stake' },          type: 'stake',    regionId: 'seoul' },
  { id: 'seoul-west-stake',   name: { ko: '서울서 스테이크', en: 'Seoul West Stake' },           type: 'stake',    regionId: 'seoul' },
  { id: 'gangneung-district', name: { ko: '강릉 지방부',     en: 'Gangneung District' },         type: 'district', regionId: 'seoul' },
  { id: 'military-district',  name: { ko: '미군 지방부',     en: 'Seoul Military District' },    type: 'district', regionId: 'seoul' },
]

// 서울남 CC: 경기, 대전, 청주, 전주
export const UNITS_SEOUL_SOUTH: Omit<Unit, 'presidentUid'>[] = [
  { id: 'gyeonggi-stake', name: { ko: '경기 스테이크', en: 'Gyeonggi Stake' }, type: 'stake', regionId: 'seoul-south' },
  { id: 'daejeon-stake',  name: { ko: '대전 스테이크', en: 'Daejeon Stake' },  type: 'stake', regionId: 'seoul-south' },
  { id: 'cheongju-stake', name: { ko: '청주 스테이크', en: 'Cheongju Stake' }, type: 'stake', regionId: 'seoul-south' },
  { id: 'jeonju-stake',   name: { ko: '전주 스테이크', en: 'Jeonju Stake' },   type: 'stake', regionId: 'seoul-south' },
]

// 부산 CC: 광주, 부산, 대구, 창원, 울산
export const UNITS_BUSAN: Omit<Unit, 'presidentUid'>[] = [
  { id: 'gwangju-stake',  name: { ko: '광주 스테이크', en: 'Gwangju Stake' },  type: 'stake',    regionId: 'busan' },
  { id: 'busan-stake',    name: { ko: '부산 스테이크', en: 'Busan Stake' },     type: 'stake',    regionId: 'busan' },
  { id: 'daegu-stake',    name: { ko: '대구 스테이크', en: 'Daegu Stake' },     type: 'stake',    regionId: 'busan' },
  { id: 'changwon-stake', name: { ko: '창원 스테이크', en: 'Changwon Stake' },  type: 'stake',    regionId: 'busan' },
  { id: 'ulsan-district', name: { ko: '울산 지방부',   en: 'Ulsan District' },  type: 'district', regionId: 'busan' },
]

/** @deprecated use ALL_UNITS filtered by regionId instead */
export const UNITS_MILITARY = UNITS_SEOUL.filter(u => u.id === 'military-district')
/** @deprecated use ALL_UNITS filtered by regionId instead */
export const UNITS_GANGNEUNG = UNITS_SEOUL.filter(u => u.id === 'gangneung-district')

export const ALL_UNITS = [...UNITS_SEOUL, ...UNITS_SEOUL_SOUTH, ...UNITS_BUSAN]

export const getUnitsByRegion = (regionId: string) =>
  ALL_UNITS.filter(u => u.regionId === regionId)

export const getRegionIdByUnit = (unitId: string): string | undefined =>
  ALL_UNITS.find(u => u.id === unitId)?.regionId

// Wards (와드) and branches (지부) per stake/district
// Source: kr.churchofjesuschrist.org/about-us/contact-us/location
export const WARDS: WardUnit[] = [
  // 서울 스테이크
  { id: 'seoul-nokbeon',   name: { ko: '녹번 와드',     en: 'Nokbeon Ward' },                      type: 'ward',   unitId: 'seoul-stake' },
  { id: 'seoul-sindang',   name: { ko: '신당 와드',     en: 'Sindang Ward' },                      type: 'ward',   unitId: 'seoul-stake' },
  { id: 'seoul-sinchon',   name: { ko: '신촌 와드',     en: 'Sinchon Ward' },                      type: 'ward',   unitId: 'seoul-stake' },
  { id: 'seoul-ilsan',     name: { ko: '일산 와드',     en: 'Ilsan Ward' },                        type: 'ward',   unitId: 'seoul-stake' },
  { id: 'seoul-paju',      name: { ko: '파주 와드',     en: 'Paju Ward' },                         type: 'ward',   unitId: 'seoul-stake' },
  { id: 'seoul-deaf',      name: { ko: '중앙 수어 지부', en: 'Jungang Sign Language Branch' },     type: 'branch', unitId: 'seoul-stake' },
  // 서울동 스테이크
  { id: 'seoul-east-gangbuk1',   name: { ko: '강북1 와드',   en: 'Gangbuk 1st Ward' },             type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-gangbuk2',   name: { ko: '강북2 와드',   en: 'Gangbuk 2nd Ward' },             type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-gyomun',     name: { ko: '교문 와드',    en: 'Gyomun Ward' },                  type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-dongdaemun', name: { ko: '동대문 와드',  en: 'Dongdaemun Ward' },               type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-uijeongbu',  name: { ko: '의정부 와드',  en: 'Uijeongbu Ward' },                type: 'ward', unitId: 'seoul-east-stake' },
  { id: 'seoul-east-chuncheon',  name: { ko: '춘천 와드',    en: 'Chuncheon Ward' },               type: 'ward', unitId: 'seoul-east-stake' },
  // 서울서 스테이크
  { id: 'seoul-west-bucheon',      name: { ko: '부천 와드',    en: 'Bucheon Ward' },               type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-yeongdeungpo', name: { ko: '영등포 와드',  en: 'Yeongdeungpo Ward' },           type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-incheon1',     name: { ko: '인천1 와드',   en: 'Incheon 1st Ward' },            type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-incheon2',     name: { ko: '인천2 와드',   en: 'Incheon 2nd Ward' },            type: 'ward', unitId: 'seoul-west-stake' },
  { id: 'seoul-west-cheongna',     name: { ko: '청라 와드',    en: 'Cheongna Ward' },               type: 'ward', unitId: 'seoul-west-stake' },
  // 서울남 스테이크
  { id: 'seoul-south-gangnam1', name: { ko: '강남1 와드', en: 'Gangnam 1st Ward' }, type: 'ward',   unitId: 'seoul-south-stake' },
  { id: 'seoul-south-gangnam2', name: { ko: '강남2 와드', en: 'Gangnam 2nd Ward' }, type: 'ward',   unitId: 'seoul-south-stake' },
  { id: 'seoul-south-songpa',   name: { ko: '송파 와드',  en: 'Songpa Ward' },      type: 'ward',   unitId: 'seoul-south-stake' },
  { id: 'seoul-south-ansan',    name: { ko: '안산 와드',  en: 'Ansan Ward' },       type: 'ward',   unitId: 'seoul-south-stake' },
  { id: 'seoul-south-anyang',   name: { ko: '안양 와드',  en: 'Anyang Ward' },      type: 'ward',   unitId: 'seoul-south-stake' },
  { id: 'seoul-south-youth',    name: { ko: '청년 지부',  en: 'Seoul South YSA Branch' }, type: 'branch', unitId: 'seoul-south-stake' },
  // 경기 스테이크
  { id: 'gyeonggi-gobanjung', name: { ko: '곡반정 와드', en: 'Gokbanjeong Ward' }, type: 'ward',   unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-bundang',   name: { ko: '분당 와드',   en: 'Bundang Ward' },     type: 'ward',   unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-suji',      name: { ko: '수지 와드',   en: 'Suji Ward' },        type: 'ward',   unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-singal',    name: { ko: '신갈 와드',   en: 'Singal Ward' },      type: 'ward',   unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-sinpung',   name: { ko: '신풍 와드',   en: 'Sinpung Ward' },     type: 'ward',   unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-anseong',   name: { ko: '안성 지부',   en: 'Anseong Branch' },   type: 'branch', unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-icheon',    name: { ko: '이천 와드',   en: 'Icheon Ward' },      type: 'ward',   unitId: 'gyeonggi-stake' },
  { id: 'gyeonggi-pyeongtaek',name: { ko: '평택 와드',   en: 'Pyeongtaek Ward' },  type: 'ward',   unitId: 'gyeonggi-stake' },
  // 대전 스테이크
  { id: 'daejeon-gongju',  name: { ko: '공주 와드',  en: 'Gongju Ward' },    type: 'ward',   unitId: 'daejeon-stake' },
  { id: 'daejeon-nonsan',  name: { ko: '논산 지부',  en: 'Nonsan Branch' },  type: 'branch', unitId: 'daejeon-stake' },
  { id: 'daejeon-1',       name: { ko: '대전1 와드', en: 'Daejeon 1st Ward' }, type: 'ward', unitId: 'daejeon-stake' },
  { id: 'daejeon-2',       name: { ko: '대전2 와드', en: 'Daejeon 2nd Ward' }, type: 'ward', unitId: 'daejeon-stake' },
  { id: 'daejeon-seosan',  name: { ko: '서산 지부',  en: 'Seosan Branch' },  type: 'branch', unitId: 'daejeon-stake' },
  { id: 'daejeon-sejong',  name: { ko: '세종 와드',  en: 'Sejong Ward' },    type: 'ward',   unitId: 'daejeon-stake' },
  // 청주 스테이크
  { id: 'cheongju-sangdang', name: { ko: '상당 와드',  en: 'Sangdang Ward' },  type: 'ward',   unitId: 'cheongju-stake' },
  { id: 'cheongju-onyang',   name: { ko: '온양 지부',  en: 'Onyang Branch' },  type: 'branch', unitId: 'cheongju-stake' },
  { id: 'cheongju-jecheon',  name: { ko: '제천 지부',  en: 'Jecheon Branch' }, type: 'branch', unitId: 'cheongju-stake' },
  { id: 'cheongju-cheonan',  name: { ko: '천안 와드',  en: 'Cheonan Ward' },   type: 'ward',   unitId: 'cheongju-stake' },
  { id: 'cheongju-chungju',  name: { ko: '충주 와드',  en: 'Chungju Ward' },   type: 'ward',   unitId: 'cheongju-stake' },
  { id: 'cheongju-heungdeok',name: { ko: '흥덕 와드',  en: 'Heungdeok Ward' }, type: 'ward',   unitId: 'cheongju-stake' },
  // 전주 스테이크
  { id: 'jeonju-gunsan',  name: { ko: '군산 와드',  en: 'Gunsan Ward' },   type: 'ward',   unitId: 'jeonju-stake' },
  { id: 'jeonju-gimje',   name: { ko: '김제 지부',  en: 'Gimje Branch' },  type: 'branch', unitId: 'jeonju-stake' },
  { id: 'jeonju-namwon',  name: { ko: '남원 지부',  en: 'Namwon Branch' }, type: 'branch', unitId: 'jeonju-stake' },
  { id: 'jeonju-iksan',   name: { ko: '익산 와드',  en: 'Iksan Ward' },    type: 'ward',   unitId: 'jeonju-stake' },
  { id: 'jeonju-deokjin', name: { ko: '덕진 와드',  en: 'Deokjin Ward' },  type: 'ward',   unitId: 'jeonju-stake' },
  { id: 'jeonju-jeongeup',name: { ko: '정읍 와드',  en: 'Jeongeup Ward' }, type: 'ward',   unitId: 'jeonju-stake' },
  { id: 'jeonju-wansan',  name: { ko: '완산 와드',  en: 'Wansan Ward' },   type: 'ward',   unitId: 'jeonju-stake' },
  // 광주 스테이크
  { id: 'gwangju-naju',     name: { ko: '나주 지부', en: 'Naju Branch' },     type: 'branch', unitId: 'gwangju-stake' },
  { id: 'gwangju-nongseong',name: { ko: '농성 와드', en: 'Nongseong Ward' },  type: 'ward',   unitId: 'gwangju-stake' },
  { id: 'gwangju-mokpo',    name: { ko: '목포 와드', en: 'Mokpo Ward' },      type: 'ward',   unitId: 'gwangju-stake' },
  { id: 'gwangju-cheomdan', name: { ko: '첨단 와드', en: 'Cheomdan Ward' },   type: 'ward',   unitId: 'gwangju-stake' },
  { id: 'gwangju-chungjang',name: { ko: '충장 와드', en: 'Chungjang Ward' },  type: 'ward',   unitId: 'gwangju-stake' },
  // 부산 스테이크
  { id: 'busan-gwangan',  name: { ko: '광안 와드',  en: 'Gwangan Ward' },    type: 'ward',   unitId: 'busan-stake' },
  { id: 'busan-goejeong', name: { ko: '명지 지부',  en: 'Myeongji Branch' }, type: 'branch', unitId: 'busan-stake' },
  { id: 'busan-gupo',     name: { ko: '구포 지부',  en: 'Gupo Branch' },     type: 'branch', unitId: 'busan-stake' },
  { id: 'busan-geumjeong',name: { ko: '금정 와드',  en: 'Geumjeong Ward' },  type: 'ward',   unitId: 'busan-stake' },
  { id: 'busan-gimhae',   name: { ko: '김해 와드',  en: 'Gimhae Ward' },     type: 'ward',   unitId: 'busan-stake' },
  { id: 'busan-busan',    name: { ko: '부산 와드',  en: 'Busan Ward' },      type: 'ward',   unitId: 'busan-stake' },
  { id: 'busan-yeonsan',  name: { ko: '연산 와드',  en: 'Yeonsan Ward' },    type: 'ward',   unitId: 'busan-stake' },
  { id: 'busan-oncheon',  name: { ko: '온천 와드',  en: 'Oncheon Ward' },    type: 'ward',   unitId: 'busan-stake' },
  { id: 'busan-haeundae', name: { ko: '해운대 와드', en: 'Haeundae Ward' },  type: 'ward',   unitId: 'busan-stake' },
  // 대구 스테이크
  { id: 'daegu-gyeongsan',name: { ko: '경산 지부',  en: 'Gyeongsan Branch' }, type: 'branch', unitId: 'daegu-stake' },
  { id: 'daegu-gumi',     name: { ko: '구미 와드',  en: 'Gumi Ward' },        type: 'ward',   unitId: 'daegu-stake' },
  { id: 'daegu-gimcheon', name: { ko: '김천 지부',  en: 'Gimcheon Branch' },  type: 'branch', unitId: 'daegu-stake' },
  { id: 'daegu-sangin',   name: { ko: '상인 와드',  en: 'Sangin Ward' },      type: 'ward',   unitId: 'daegu-stake' },
  { id: 'daegu-suseong',  name: { ko: '수성 와드',  en: 'Suseong Ward' },     type: 'ward',   unitId: 'daegu-stake' },
  { id: 'daegu-andong',   name: { ko: '안동 지부',  en: 'Andong Branch' },    type: 'branch', unitId: 'daegu-stake' },
  { id: 'daegu-jungni',   name: { ko: '중리 와드',  en: 'Jungni Ward' },      type: 'ward',   unitId: 'daegu-stake' },
  // 창원 스테이크
  { id: 'changwon-geoje',    name: { ko: '거제 지부',  en: 'Geoje Branch' },     type: 'branch', unitId: 'changwon-stake' },
  { id: 'changwon-dogye',    name: { ko: '도계 와드',  en: 'Dogye Ward' },       type: 'ward',   unitId: 'changwon-stake' },
  { id: 'changwon-masan',    name: { ko: '마산 와드',  en: 'Masan Ward' },       type: 'ward',   unitId: 'changwon-stake' },
  { id: 'changwon-miryang',  name: { ko: '밀양 지부',  en: 'Milyang Branch' },   type: 'branch', unitId: 'changwon-stake' },
  { id: 'changwon-sacheon',  name: { ko: '사천 지부',  en: 'Sacheon Branch' },   type: 'branch', unitId: 'changwon-stake' },
  { id: 'changwon-jinju',    name: { ko: '진주 와드',  en: 'Jinju Ward' },       type: 'ward',   unitId: 'changwon-stake' },
  { id: 'changwon-jinhae',   name: { ko: '진해 와드',  en: 'Jinhae Ward' },      type: 'ward',   unitId: 'changwon-stake' },
  { id: 'changwon-tongyeong',name: { ko: '통영 지부',  en: 'Tongyeong Branch' }, type: 'branch', unitId: 'changwon-stake' },
  // 울산 지방부
  { id: 'ulsan-gyeongju',  name: { ko: '경주 지부',   en: 'Gyeongju Branch' },   type: 'branch', unitId: 'ulsan-district' },
  { id: 'ulsan-bangeojin', name: { ko: '방어진 지부', en: 'Bangeojin Branch' },  type: 'branch', unitId: 'ulsan-district' },
  { id: 'ulsan-sinjeong',  name: { ko: '신정 지부',   en: 'Sinjeong Branch' },   type: 'branch', unitId: 'ulsan-district' },
  { id: 'ulsan-pohang',    name: { ko: '포항 지부',   en: 'Pohang Branch' },     type: 'branch', unitId: 'ulsan-district' },
  { id: 'ulsan-hogye',     name: { ko: '호계 지부',   en: 'Hogye Branch' },      type: 'branch', unitId: 'ulsan-district' },
  // 강릉 지방부
  { id: 'gangneung-gangneung', name: { ko: '강릉 지부', en: 'Gangneung Branch' }, type: 'branch', unitId: 'gangneung-district' },
  { id: 'gangneung-donghae',   name: { ko: '동해 지부', en: 'Donghae Branch' },   type: 'branch', unitId: 'gangneung-district' },
  { id: 'gangneung-sokcho',    name: { ko: '속초 지부', en: 'Sokcho Branch' },    type: 'branch', unitId: 'gangneung-district' },
  { id: 'gangneung-wonju',     name: { ko: '원주 지부', en: 'Wonju Branch' },     type: 'branch', unitId: 'gangneung-district' },
  { id: 'gangneung-taebaek',   name: { ko: '태백 지부', en: 'Taebaek Branch' },   type: 'branch', unitId: 'gangneung-district' },
  // 미군 지방부
  { id: 'military-gunsan',    name: { ko: '군산 군인 지부',   en: 'Gunsan Military Branch' },        type: 'branch', unitId: 'military-district' },
  { id: 'military-northern',  name: { ko: '노던 군인 지부',   en: 'Northern Military Branch' },      type: 'branch', unitId: 'military-district' },
  { id: 'military-daegu',     name: { ko: '대구 군인 지부',   en: 'Daegu Military Branch' },         type: 'branch', unitId: 'military-district' },
  { id: 'military-seoul-en',  name: { ko: '서울 영어 지부',   en: 'Seoul English Branch' },          type: 'branch', unitId: 'military-district' },
  { id: 'military-songdo',    name: { ko: '송도 영어 지부',   en: 'Songdo English Branch' },         type: 'branch', unitId: 'military-district' },
  { id: 'military-osan',      name: { ko: '오산 군인 지부',   en: 'Osan Military Branch' },          type: 'branch', unitId: 'military-district' },
  { id: 'military-humphreys', name: { ko: '험프리 군인 지부', en: 'Camp Humphreys Military Branch' }, type: 'branch', unitId: 'military-district' },
]

export const getWardsByUnit = (unitId: string): WardUnit[] =>
  WARDS.filter(w => w.unitId === unitId)
