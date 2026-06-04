export const REGIONS = [
    { id: 'seoul', name: '서울' },
    { id: 'seoul-south', name: '서울남' },
    { id: 'busan', name: '부산' },
];
export const UNITS_SEOUL = [
    { id: 'seoul-stake', name: '서울 스테이크', type: 'stake', regionId: 'seoul' },
    { id: 'seoul-east-stake', name: '서울동 스테이크', type: 'stake', regionId: 'seoul' },
    { id: 'seoul-west-stake', name: '서울서 스테이크', type: 'stake', regionId: 'seoul' },
    { id: 'gyeonggi-stake', name: '경기 스테이크', type: 'stake', regionId: 'seoul' },
];
export const UNITS_SEOUL_SOUTH = [
    { id: 'seoul-south-stake', name: '서울남 스테이크', type: 'stake', regionId: 'seoul-south' },
    { id: 'daejeon-stake', name: '대전 스테이크', type: 'stake', regionId: 'seoul-south' },
    { id: 'cheongju-stake', name: '청주 스테이크', type: 'stake', regionId: 'seoul-south' },
    { id: 'jeonju-stake', name: '전주 스테이크', type: 'stake', regionId: 'seoul-south' },
    { id: 'gwangju-stake', name: '광주 스테이크', type: 'stake', regionId: 'seoul-south' },
];
export const UNITS_BUSAN = [
    { id: 'busan-stake', name: '부산 스테이크', type: 'stake', regionId: 'busan' },
    { id: 'daegu-stake', name: '대구 스테이크', type: 'stake', regionId: 'busan' },
    { id: 'changwon-stake', name: '창원 스테이크', type: 'stake', regionId: 'busan' },
    { id: 'ulsan-district', name: '울산 지방부', type: 'district', regionId: 'busan' },
];
export const ALL_UNITS = [...UNITS_SEOUL, ...UNITS_SEOUL_SOUTH, ...UNITS_BUSAN];
export const getUnitsByRegion = (regionId) => ALL_UNITS.filter(u => u.regionId === regionId);
// Wards (와드) and branches (지부) per stake/district
export const WARDS = [
    // 서울 스테이크
    { id: 'seoul-1', name: '서울1와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-2', name: '서울2와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-3', name: '서울3와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-4', name: '서울4와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-5', name: '서울5와드', type: 'ward', unitId: 'seoul-stake' },
    // 서울동 스테이크
    { id: 'seoul-east-1', name: '서울동1와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-2', name: '서울동2와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-3', name: '서울동3와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-4', name: '서울동4와드', type: 'ward', unitId: 'seoul-east-stake' },
    // 서울서 스테이크
    { id: 'seoul-west-1', name: '서울서1와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-2', name: '서울서2와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-3', name: '서울서3와드', type: 'ward', unitId: 'seoul-west-stake' },
    // 경기 스테이크
    { id: 'gyeonggi-1', name: '경기1와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-2', name: '경기2와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-3', name: '경기3와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-4', name: '경기4와드', type: 'ward', unitId: 'gyeonggi-stake' },
    // 서울남 스테이크
    { id: 'seoul-south-1', name: '서울남1와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-2', name: '서울남2와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-3', name: '서울남3와드', type: 'ward', unitId: 'seoul-south-stake' },
    // 대전 스테이크
    { id: 'daejeon-1', name: '대전1와드', type: 'ward', unitId: 'daejeon-stake' },
    { id: 'daejeon-2', name: '대전2와드', type: 'ward', unitId: 'daejeon-stake' },
    { id: 'daejeon-3', name: '대전3와드', type: 'ward', unitId: 'daejeon-stake' },
    // 청주 스테이크
    { id: 'cheongju-1', name: '청주1와드', type: 'ward', unitId: 'cheongju-stake' },
    { id: 'cheongju-2', name: '청주2와드', type: 'ward', unitId: 'cheongju-stake' },
    // 전주 스테이크
    { id: 'jeonju-1', name: '전주1와드', type: 'ward', unitId: 'jeonju-stake' },
    { id: 'jeonju-2', name: '전주2와드', type: 'ward', unitId: 'jeonju-stake' },
    // 광주 스테이크
    { id: 'gwangju-1', name: '광주1와드', type: 'ward', unitId: 'gwangju-stake' },
    { id: 'gwangju-2', name: '광주2와드', type: 'ward', unitId: 'gwangju-stake' },
    { id: 'gwangju-3', name: '광주3와드', type: 'ward', unitId: 'gwangju-stake' },
    // 부산 스테이크
    { id: 'busan-1', name: '부산1와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-2', name: '부산2와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-3', name: '부산3와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-4', name: '부산4와드', type: 'ward', unitId: 'busan-stake' },
    // 대구 스테이크
    { id: 'daegu-1', name: '대구1와드', type: 'ward', unitId: 'daegu-stake' },
    { id: 'daegu-2', name: '대구2와드', type: 'ward', unitId: 'daegu-stake' },
    { id: 'daegu-3', name: '대구3와드', type: 'ward', unitId: 'daegu-stake' },
    // 창원 스테이크
    { id: 'changwon-1', name: '창원1와드', type: 'ward', unitId: 'changwon-stake' },
    { id: 'changwon-2', name: '창원2와드', type: 'ward', unitId: 'changwon-stake' },
    // 울산 지방부
    { id: 'ulsan-branch', name: '울산지부', type: 'branch', unitId: 'ulsan-district' },
    { id: 'geoje-branch', name: '거제지부', type: 'branch', unitId: 'ulsan-district' },
];
export const getWardsByUnit = (unitId) => WARDS.filter(w => w.unitId === unitId);
