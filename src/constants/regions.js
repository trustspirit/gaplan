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
// Source: kr.churchofjesuschrist.org/about-us/contact-us/location
export const WARDS = [
    // 서울 스테이크
    { id: 'seoul-nokbeon', name: '녹번 와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-sindang', name: '신당 와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-sinchon', name: '신촌 와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-ilsan', name: '일산 와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-paju', name: '파주 와드', type: 'ward', unitId: 'seoul-stake' },
    { id: 'seoul-deaf', name: '중앙 농아 지부', type: 'branch', unitId: 'seoul-stake' },
    // 서울동 스테이크
    { id: 'seoul-east-gangbuk1', name: '강북1 와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-gangbuk2', name: '강북2 와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-gyomun', name: '교문 와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-dongdaemun', name: '동대문 와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-uijeongbu', name: '의정부 와드', type: 'ward', unitId: 'seoul-east-stake' },
    { id: 'seoul-east-chuncheon', name: '춘천 와드', type: 'ward', unitId: 'seoul-east-stake' },
    // 서울서 스테이크
    { id: 'seoul-west-gimpo', name: '김포 와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-bucheon', name: '부천 와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-yeongdeungpo', name: '영등포 와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-incheon1', name: '인천1 와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-incheon2', name: '인천2 와드', type: 'ward', unitId: 'seoul-west-stake' },
    { id: 'seoul-west-cheongna', name: '청라 와드', type: 'ward', unitId: 'seoul-west-stake' },
    // 서울남 스테이크
    { id: 'seoul-south-gangnam1', name: '강남1 와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-gangnam2', name: '강남2 와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-songpa', name: '송파 와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-ansan', name: '안산 와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-anyang', name: '안양 와드', type: 'ward', unitId: 'seoul-south-stake' },
    { id: 'seoul-south-youth', name: '청년 지부', type: 'branch', unitId: 'seoul-south-stake' },
    // 경기 스테이크
    { id: 'gyeonggi-gobanjung', name: '곡반정 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-bundang', name: '분당 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-suji', name: '수지 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-singal', name: '신갈 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-sinpung', name: '신풍 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-anseong', name: '안성 지부', type: 'branch', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-icheon', name: '이천 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    { id: 'gyeonggi-pyeongtaek', name: '평택 와드', type: 'ward', unitId: 'gyeonggi-stake' },
    // 대전 스테이크
    { id: 'daejeon-gongju', name: '공주 와드', type: 'ward', unitId: 'daejeon-stake' },
    { id: 'daejeon-nonsan', name: '논산 지부', type: 'branch', unitId: 'daejeon-stake' },
    { id: 'daejeon-1', name: '대전1 와드', type: 'ward', unitId: 'daejeon-stake' },
    { id: 'daejeon-2', name: '대전2 와드', type: 'ward', unitId: 'daejeon-stake' },
    { id: 'daejeon-seosan', name: '서산 지부', type: 'branch', unitId: 'daejeon-stake' },
    { id: 'daejeon-sejong', name: '세종 와드', type: 'ward', unitId: 'daejeon-stake' },
    // 청주 스테이크
    { id: 'cheongju-sangdang', name: '상당 와드', type: 'ward', unitId: 'cheongju-stake' },
    { id: 'cheongju-onyang', name: '온양 지부', type: 'branch', unitId: 'cheongju-stake' },
    { id: 'cheongju-jecheon', name: '제천 지부', type: 'branch', unitId: 'cheongju-stake' },
    { id: 'cheongju-cheonan', name: '천안 와드', type: 'ward', unitId: 'cheongju-stake' },
    { id: 'cheongju-chungju', name: '충주 와드', type: 'ward', unitId: 'cheongju-stake' },
    { id: 'cheongju-heungdeok', name: '흥덕 와드', type: 'ward', unitId: 'cheongju-stake' },
    // 전주 스테이크
    { id: 'jeonju-gunsan', name: '군산 와드', type: 'ward', unitId: 'jeonju-stake' },
    { id: 'jeonju-gimje', name: '김제 지부', type: 'branch', unitId: 'jeonju-stake' },
    { id: 'jeonju-namwon', name: '남원 지부', type: 'branch', unitId: 'jeonju-stake' },
    { id: 'jeonju-iksan', name: '익산 와드', type: 'ward', unitId: 'jeonju-stake' },
    { id: 'jeonju-deokjin', name: '덕진 와드', type: 'ward', unitId: 'jeonju-stake' },
    { id: 'jeonju-jeongeup', name: '정읍 와드', type: 'ward', unitId: 'jeonju-stake' },
    { id: 'jeonju-wansan', name: '완산 와드', type: 'ward', unitId: 'jeonju-stake' },
    // 광주 스테이크
    { id: 'gwangju-naju', name: '나주 지부', type: 'branch', unitId: 'gwangju-stake' },
    { id: 'gwangju-nongseong', name: '농성 와드', type: 'ward', unitId: 'gwangju-stake' },
    { id: 'gwangju-mokpo', name: '목포 와드', type: 'ward', unitId: 'gwangju-stake' },
    { id: 'gwangju-cheomdan', name: '첨단 와드', type: 'ward', unitId: 'gwangju-stake' },
    { id: 'gwangju-chungjang', name: '충장 와드', type: 'ward', unitId: 'gwangju-stake' },
    // 부산 스테이크
    { id: 'busan-gwangan', name: '광안 와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-goejeong', name: '괴정 지부', type: 'branch', unitId: 'busan-stake' },
    { id: 'busan-gupo', name: '구포 지부', type: 'branch', unitId: 'busan-stake' },
    { id: 'busan-geumjeong', name: '금정 와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-gimhae', name: '김해 와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-busan', name: '부산 와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-yeonsan', name: '연산 와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-oncheon', name: '온천 와드', type: 'ward', unitId: 'busan-stake' },
    { id: 'busan-haeundae', name: '해운대 와드', type: 'ward', unitId: 'busan-stake' },
    // 대구 스테이크
    { id: 'daegu-gyeongsan', name: '경산 지부', type: 'branch', unitId: 'daegu-stake' },
    { id: 'daegu-gumi', name: '구미 와드', type: 'ward', unitId: 'daegu-stake' },
    { id: 'daegu-gimcheon', name: '김천 지부', type: 'branch', unitId: 'daegu-stake' },
    { id: 'daegu-sangin', name: '상인 와드', type: 'ward', unitId: 'daegu-stake' },
    { id: 'daegu-suseong', name: '수성 와드', type: 'ward', unitId: 'daegu-stake' },
    { id: 'daegu-andong', name: '안동 지부', type: 'branch', unitId: 'daegu-stake' },
    { id: 'daegu-jungni', name: '중리 와드', type: 'ward', unitId: 'daegu-stake' },
    // 창원 스테이크
    { id: 'changwon-geoje', name: '거제 지부', type: 'branch', unitId: 'changwon-stake' },
    { id: 'changwon-dogye', name: '도계 와드', type: 'ward', unitId: 'changwon-stake' },
    { id: 'changwon-masan', name: '마산 와드', type: 'ward', unitId: 'changwon-stake' },
    { id: 'changwon-miryang', name: '밀양 지부', type: 'branch', unitId: 'changwon-stake' },
    { id: 'changwon-sacheon', name: '사천 지부', type: 'branch', unitId: 'changwon-stake' },
    { id: 'changwon-jinju', name: '진주 와드', type: 'ward', unitId: 'changwon-stake' },
    { id: 'changwon-jinhae', name: '진해 와드', type: 'ward', unitId: 'changwon-stake' },
    { id: 'changwon-tongyeong', name: '통영 지부', type: 'branch', unitId: 'changwon-stake' },
    // 울산 지방부
    { id: 'ulsan-gyeongju', name: '경주 지부', type: 'branch', unitId: 'ulsan-district' },
    { id: 'ulsan-bangeojin', name: '방어진 지부', type: 'branch', unitId: 'ulsan-district' },
    { id: 'ulsan-sinjeong', name: '신정 지부', type: 'branch', unitId: 'ulsan-district' },
    { id: 'ulsan-pohang', name: '포항 지부', type: 'branch', unitId: 'ulsan-district' },
    { id: 'ulsan-hogye', name: '호계 지부', type: 'branch', unitId: 'ulsan-district' },
];
export const getWardsByUnit = (unitId) => WARDS.filter(w => w.unitId === unitId);
