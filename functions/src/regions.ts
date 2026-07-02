// IMPORTANT: This data is duplicated from src/constants/regions.ts (no shared package).
// Keep in sync when adding/removing stakes or districts.
const REGION_UNITS: Record<string, string[]> = {
  'seoul': ['seoul-stake', 'seoul-east-stake', 'seoul-south-stake', 'seoul-west-stake', 'gangneung-district', 'military-district'],
  'seoul-south': ['gyeonggi-stake', 'daejeon-stake', 'cheongju-stake', 'jeonju-stake'],
  'busan': ['gwangju-stake', 'busan-stake', 'daegu-stake', 'changwon-stake', 'ulsan-district'],
}

// All scope display names (regions + units)
const SCOPE_NAMES: Record<string, string> = {
  'seoul': '서울 CC',
  'seoul-south': '서울남 CC',
  'busan': '부산 CC',
  'seoul-stake': '서울 스테이크',
  'seoul-east-stake': '서울동 스테이크',
  'seoul-south-stake': '서울남 스테이크',
  'seoul-west-stake': '서울서 스테이크',
  'gyeonggi-stake': '경기 스테이크',
  'daejeon-stake': '대전 스테이크',
  'cheongju-stake': '청주 스테이크',
  'jeonju-stake': '전주 스테이크',
  'gwangju-stake': '광주 스테이크',
  'busan-stake': '부산 스테이크',
  'daegu-stake': '대구 스테이크',
  'changwon-stake': '창원 스테이크',
  'ulsan-district': '울산 지방부',
  'military-district': '미군 지방부',
  'gangneung-district': '강릉 지방부',
}

/**
 * Returns the unit IDs that belong to a scope.
 * - For a region scopeId: returns all unit IDs in that region.
 * - For a unit scopeId: returns [scopeId] (a unit is its own scope).
 * - Unknown scopeId: returns [].
 */
export function getScopeUnitIds(scopeId: string): string[] {
  if (REGION_UNITS[scopeId]) return REGION_UNITS[scopeId]
  if (SCOPE_NAMES[scopeId]) return [scopeId]
  return []
}

/**
 * Returns the Korean display name for a scope.
 * Returns '' for unknown scopeIds.
 */
export function getScopeDisplayName(scopeId: string): string {
  return SCOPE_NAMES[scopeId] ?? ''
}

// Ward/branch Korean-name -> id. Mirror of the WARDS table in src/constants/regions.ts
// (only id + name.ko needed here). Keep in sync when adding/removing wards.
const WARD_ID_BY_NAME_KO: Record<string, string> = {
  // 서울 스테이크
  '녹번 와드': 'seoul-nokbeon',
  '신당 와드': 'seoul-sindang',
  '신촌 와드': 'seoul-sinchon',
  '일산 와드': 'seoul-ilsan',
  '파주 와드': 'seoul-paju',
  '중앙 수어 지부': 'seoul-deaf',
  // 서울동 스테이크
  '강북1 와드': 'seoul-east-gangbuk1',
  '강북2 와드': 'seoul-east-gangbuk2',
  '교문 와드': 'seoul-east-gyomun',
  '동대문 와드': 'seoul-east-dongdaemun',
  '의정부 와드': 'seoul-east-uijeongbu',
  '춘천 와드': 'seoul-east-chuncheon',
  // 서울서 스테이크
  '부천 와드': 'seoul-west-bucheon',
  '영등포 와드': 'seoul-west-yeongdeungpo',
  '인천1 와드': 'seoul-west-incheon1',
  '인천2 와드': 'seoul-west-incheon2',
  '청라 와드': 'seoul-west-cheongna',
  // 서울남 스테이크
  '강남1 와드': 'seoul-south-gangnam1',
  '강남2 와드': 'seoul-south-gangnam2',
  '송파 와드': 'seoul-south-songpa',
  '안산 와드': 'seoul-south-ansan',
  '안양 와드': 'seoul-south-anyang',
  '청년 지부': 'seoul-south-youth',
  // 경기 스테이크
  '곡반정 와드': 'gyeonggi-gobanjung',
  '분당 와드': 'gyeonggi-bundang',
  '수지 와드': 'gyeonggi-suji',
  '신갈 와드': 'gyeonggi-singal',
  '신풍 와드': 'gyeonggi-sinpung',
  '안성 지부': 'gyeonggi-anseong',
  '이천 와드': 'gyeonggi-icheon',
  '평택 와드': 'gyeonggi-pyeongtaek',
  // 대전 스테이크
  '공주 와드': 'daejeon-gongju',
  '논산 지부': 'daejeon-nonsan',
  '대전1 와드': 'daejeon-1',
  '대전2 와드': 'daejeon-2',
  '서산 지부': 'daejeon-seosan',
  '세종 와드': 'daejeon-sejong',
  // 청주 스테이크
  '상당 와드': 'cheongju-sangdang',
  '온양 지부': 'cheongju-onyang',
  '제천 지부': 'cheongju-jecheon',
  '천안 와드': 'cheongju-cheonan',
  '충주 와드': 'cheongju-chungju',
  '흥덕 와드': 'cheongju-heungdeok',
  // 전주 스테이크
  '군산 와드': 'jeonju-gunsan',
  '김제 지부': 'jeonju-gimje',
  '남원 지부': 'jeonju-namwon',
  '익산 와드': 'jeonju-iksan',
  '덕진 와드': 'jeonju-deokjin',
  '정읍 와드': 'jeonju-jeongeup',
  '완산 와드': 'jeonju-wansan',
  // 광주 스테이크
  '나주 지부': 'gwangju-naju',
  '농성 와드': 'gwangju-nongseong',
  '목포 와드': 'gwangju-mokpo',
  '첨단 와드': 'gwangju-cheomdan',
  '충장 와드': 'gwangju-chungjang',
  // 부산 스테이크
  '광안 와드': 'busan-gwangan',
  '명지 지부': 'busan-goejeong',
  '구포 지부': 'busan-gupo',
  '금정 와드': 'busan-geumjeong',
  '김해 와드': 'busan-gimhae',
  '부산 와드': 'busan-busan',
  '연산 와드': 'busan-yeonsan',
  '온천 와드': 'busan-oncheon',
  '해운대 와드': 'busan-haeundae',
  // 대구 스테이크
  '경산 지부': 'daegu-gyeongsan',
  '구미 와드': 'daegu-gumi',
  '김천 지부': 'daegu-gimcheon',
  '상인 와드': 'daegu-sangin',
  '수성 와드': 'daegu-suseong',
  '안동 지부': 'daegu-andong',
  '중리 와드': 'daegu-jungni',
  // 창원 스테이크
  '거제 지부': 'changwon-geoje',
  '도계 와드': 'changwon-dogye',
  '마산 와드': 'changwon-masan',
  '밀양 지부': 'changwon-miryang',
  '사천 지부': 'changwon-sacheon',
  '진주 와드': 'changwon-jinju',
  '진해 와드': 'changwon-jinhae',
  '통영 지부': 'changwon-tongyeong',
  // 울산 지방부
  '경주 지부': 'ulsan-gyeongju',
  '방어진 지부': 'ulsan-bangeojin',
  '신정 지부': 'ulsan-sinjeong',
  '포항 지부': 'ulsan-pohang',
  '호계 지부': 'ulsan-hogye',
  // 강릉 지방부
  '강릉 지부': 'gangneung-gangneung',
  '동해 지부': 'gangneung-donghae',
  '속초 지부': 'gangneung-sokcho',
  '원주 지부': 'gangneung-wonju',
  '태백 지부': 'gangneung-taebaek',
  // 미군 지방부
  '군산 군인 지부': 'military-gunsan',
  '노던 군인 지부': 'military-northern',
  '대구 군인 지부': 'military-daegu',
  '서울 영어 지부': 'military-seoul-en',
  '송도 영어 지부': 'military-songdo',
  '오산 군인 지부': 'military-osan',
  '험프리 군인 지부': 'military-humphreys',
}

/**
 * Resolves a ward/branch Korean name to its id. Mirror of getWardIdByName in
 * src/constants/regions.ts. Returns undefined for unknown names.
 */
export function getWardIdByName(wardNameKo: string): string | undefined {
  return WARD_ID_BY_NAME_KO[wardNameKo]
}
