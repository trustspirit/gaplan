import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

type LeaderRole = '감독' | '스테이크 회장' | '지방부 회장' | '지부 회장'

interface LeaderData {
  externalUnitId: number
  unitNameKo: string
  unitNameEn: string
  role: LeaderRole
  name: string
  phone?: string
  email?: string
}

const LEADERS_DATA: LeaderData[] = [
  { externalUnitId: 169943, unitNameKo: "흥덕 와드", unitNameEn: "Heungdeok Ward", role: "감독", name: "조일진", phone: "010-2236-9524", email: "iljin119@naver.com" },
  { externalUnitId: 72044, unitNameKo: "신촌 와드", unitNameEn: "Sinchon Ward", role: "감독", name: "권경민", phone: "010-3231-0326" },
  { externalUnitId: 513938, unitNameKo: "광주 스테이크", unitNameEn: "Gwangju Stake", role: "스테이크 회장", name: "김정기", phone: "010-8734-5244", email: "poponion@naver.com" },
  { externalUnitId: 301779, unitNameKo: "평택 와드", unitNameEn: "Pyeongtaek Ward", role: "감독", name: "한상희", phone: "010-8327-0883", email: "ldsopa@naver.com" },
  { externalUnitId: 240567, unitNameKo: "거제 지부", unitNameEn: "Geoje Branch", role: "지부 회장", name: "장지남", phone: "010-7680-7142", email: "mormonj@naver.com" },
  { externalUnitId: 218820, unitNameKo: "신갈 와드", unitNameEn: "Singal Ward", role: "감독", name: "장동환", phone: "010-5593-3457", email: "wafering@hanmail.net" },
  { externalUnitId: 95893, unitNameKo: "중리 와드", unitNameEn: "Jungni Ward", role: "감독", name: "변창훈", phone: "010-9146-7350", email: "miworld41@gmail.com" },
  { externalUnitId: 262366, unitNameKo: "일산 와드", unitNameEn: "Ilsan Ward", role: "감독", name: "백정환", phone: "010-2512-0680", email: "bbeakjung@churchofjesuschrist.org" },
  { externalUnitId: 92509, unitNameKo: "신당 와드", unitNameEn: "Sindang Ward", role: "감독", name: "장영석", phone: "010-5019-5780", email: "jang3537@hanmail.net" },
  { externalUnitId: 506664, unitNameKo: "서울 스테이크", unitNameEn: "Seoul Stake", role: "스테이크 회장", name: "하태완", phone: "010-8860-5981", email: "hataewan@hotmail.com" },
  { externalUnitId: 280917, unitNameKo: "태백 지부", unitNameEn: "Taebaek Branch", role: "지부 회장", name: "이태호", phone: "010-9881-1347", email: "anoktaeho@naver.com" },
  { externalUnitId: 190950, unitNameKo: "안동 지부", unitNameEn: "Andong Branch", role: "지부 회장", name: "정요택", phone: "010-2550-7777", email: "Kkingj48@naver.com" },
  { externalUnitId: 301442, unitNameKo: "파주 와드", unitNameEn: "Paju Ward", role: "감독", name: "이동주", phone: "010-3147-8344", email: "2sdigital8344@gmail.com" },
  { externalUnitId: 301469, unitNameKo: "천안 와드", unitNameEn: "Cheonan Ward", role: "감독", name: "신낙규", phone: "010-5496-1368", email: "sch.kleen@gmail.com" },
  { externalUnitId: 280976, unitNameKo: "공주 와드", unitNameEn: "Gongju Ward", role: "감독", name: "이상범", phone: "010-5836-6258", email: "macksanglee94@gmail.com" },
  { externalUnitId: 527939, unitNameKo: "대전 스테이크", unitNameEn: "Daejeon Stake", role: "스테이크 회장", name: "정양수", phone: "010-6660-6513", email: "Jung_ys@cnu.ac.kr" },
  { externalUnitId: 81019, unitNameKo: "덕진 와드", unitNameEn: "Deokjin Ward", role: "감독", name: "박성옥", phone: "010-9335-2112", email: "ajungsungp@hanmail.net" },
  { externalUnitId: 280925, unitNameKo: "정읍 와드", unitNameEn: "Jeongeup Ward", role: "감독", name: "김건국", phone: "010-6273-7451", email: "rjsrnr0315@daum.net" },
  { externalUnitId: 131350, unitNameKo: "청라 와드", unitNameEn: "Cheongna Ward", role: "감독", name: "이의섭", phone: "010-6393-9262", email: "vintage8949@naver.com" },
  { externalUnitId: 75760, unitNameKo: "충장 와드", unitNameEn: "Chungjang Ward", role: "감독", name: "도재욱", phone: "010-9105-9975", email: "dojaewook@naver.com" },
  { externalUnitId: 301760, unitNameKo: "논산 지부", unitNameEn: "Nonsan Branch", role: "지부 회장", name: "전일진", phone: "010-3467-1343", email: "kmb38@naver.com" },
  { externalUnitId: 85480, unitNameKo: "온천 와드", unitNameEn: "Oncheon Ward", role: "감독", name: "김양우", phone: "010-6420-2563", email: "jftech@hanmail.net" },
  { externalUnitId: 374741, unitNameKo: "제주 지방부", unitNameEn: "Jeju District", role: "지방부 회장", name: "문경호", phone: "010-3939-5034", email: "coack77@naver.com" },
  { externalUnitId: 311154, unitNameKo: "대전2 와드", unitNameEn: "Daejeon 2nd Ward", role: "감독", name: "나선왕", phone: "010-2616-5096", email: "bliss4you11@naver.com" },
  { externalUnitId: 518158, unitNameKo: "전주 스테이크", unitNameEn: "Jeonju Stake", role: "스테이크 회장", name: "장진규", phone: "010-9851-0155", email: "ldscjk@gmail.com" },
  { externalUnitId: 280941, unitNameKo: "도계 와드", unitNameEn: "Dogye Ward", role: "감독", name: "이경표", phone: "010-9611-9257", email: "smart_06@naver.com" },
  { externalUnitId: 113158, unitNameKo: "원주 지부", unitNameEn: "Wonju Branch", role: "지부 회장", name: "최동식", phone: "010-5950-5746", email: "churchofmine@gmail.com" },
  { externalUnitId: 112437, unitNameKo: "강북2 와드", unitNameEn: "Gangbuk 2nd Ward", role: "감독", name: "김인구", phone: "010-3727-7663", email: "ds1llr@hanmail.net" },
  { externalUnitId: 611565, unitNameKo: "강릉 지방부", unitNameEn: "Gangneung District", role: "지방부 회장", name: "송병철", phone: "010-2520-2270", email: "nauvooo@gmail.com" },
  { externalUnitId: 301450, unitNameKo: "영등포 와드", unitNameEn: "Yeongdeungpo Ward", role: "감독", name: "노동일", phone: "010-4300-6670", email: "linus_noh@hanmail.net" },
  { externalUnitId: 112569, unitNameKo: "진주 와드", unitNameEn: "Jinju Ward", role: "감독", name: "박수근", phone: "010-3112-5251", email: "sooh901@gmail.com" },
  { externalUnitId: 280895, unitNameKo: "송파 와드", unitNameEn: "Songpa Ward", role: "감독", name: "전승철", phone: "010-2391-7980", email: "curestar@naver.com" },
  { externalUnitId: 280291, unitNameKo: "안산 와드", unitNameEn: "Ansan Ward", role: "감독", name: "김병규", phone: "010-5771-4913", email: "naturalist85@kakao.com" },
  { externalUnitId: 602310, unitNameKo: "Seoul Korea Military District", unitNameEn: "Seoul Military District", role: "지방부 회장", name: "JonDavidHoldaway", phone: "010-3912-5487", email: "skmdpresident@gmail.com" },
  { externalUnitId: 112615, unitNameKo: "호계 지부", unitNameEn: "Hogye Branch", role: "지부 회장", name: "서민수", phone: "010-3227-9254", email: "ms-seo7801@hanmail.net" },
  { externalUnitId: 258466, unitNameKo: "Pyeongtaek Military Branch", unitNameEn: "Pyeongtaek Military Branch", role: "지부 회장", name: "HaroldMarkEngstrom", phone: "010-2596-1876", email: "engstromharold@gmail.com" },
  { externalUnitId: 515825, unitNameKo: "청주 스테이크", unitNameEn: "Cheongju Stake", role: "스테이크 회장", name: "양홍조", phone: "010-3943-2609", email: "yhongjoe@gmail.com" },
  { externalUnitId: 301329, unitNameKo: "김천 지부", unitNameEn: "Gimcheon Branch", role: "지부 회장", name: "김창호", phone: "010-3509-9079", email: "minsol@gyo6.net" },
  { externalUnitId: 212849, unitNameKo: "금정 와드", unitNameEn: "Geumjeong Ward", role: "감독", name: "이선우", phone: "010-2555-2515", email: "lds2515@hanmail.net" },
  { externalUnitId: 2184087, unitNameKo: "서울 청년 독신 지부", unitNameEn: "Seoul YSA Branch", role: "지부 회장", name: "최충일", phone: "010-8248-9694", email: "chullung2@hanmail.net" },
  { externalUnitId: 84336, unitNameKo: "인천1 와드", unitNameEn: "Incheon 1st Ward", role: "감독", name: "이태선", phone: "010-2086-8992", email: "taeseonlee19@gmail.com" },
  { externalUnitId: 112577, unitNameKo: "구미 와드", unitNameEn: "Gumi Ward", role: "감독", name: "김재균", phone: "010-4574-0225", email: "monggoose@hanmail.net" },
  { externalUnitId: 162973, unitNameKo: "강남2 와드", unitNameEn: "Gangnam 2nd Ward", role: "감독", name: "박효민", phone: "010-9159-8326", email: "showminman@outlook.com" },
  { externalUnitId: 514977, unitNameKo: "서울서 스테이크", unitNameEn: "Seoul West Stake", role: "스테이크 회장", name: "오우현", phone: "010-3303-6860", email: "amon5@hanmail.net" },
  { externalUnitId: 113824, unitNameKo: "안양 와드", unitNameEn: "Anyang Ward", role: "감독", name: "심찬보", phone: "010-2389-9654", email: "ldsshim@hanmail.net" },
  { externalUnitId: 133809, unitNameKo: "익산 와드", unitNameEn: "Iksan Ward", role: "감독", name: "박만배", phone: "010-4124-5966", email: "ddaihanmb@naver.com" },
  { externalUnitId: 384534, unitNameKo: "수지 와드", unitNameEn: "Suji Ward", role: "감독", name: "박진하", phone: "010-2369-6925", email: "1004jinha@hanmail.net" },
  { externalUnitId: 83593, unitNameKo: "신풍 와드", unitNameEn: "Sinpung Ward", role: "감독", name: "정준우", phone: "010-2767-7201", email: "junewoo7@hanmail.net" },
  { externalUnitId: 71145, unitNameKo: "동대문 와드", unitNameEn: "Dongdaemun Ward", role: "감독", name: "이슬기", phone: "010-7628-1322", email: "lsk0409@gmail.com" },
  { externalUnitId: 142042, unitNameKo: "신정 지부", unitNameEn: "Sinjeong Branch", role: "지부 회장", name: "강현오", phone: "010-7427-4525", email: "honeykang@hanmail.net" },
  { externalUnitId: 212067, unitNameKo: "곡반정 와드", unitNameEn: "Gokbanjeong Ward", role: "감독", name: "최종찬", phone: "010-2332-1561", email: "cjc1561@naver.com" },
  { externalUnitId: 280704, unitNameKo: "사천 지부", unitNameEn: "Sacheon Branch", role: "지부 회장", name: "신석환", phone: "010-4923-6168", email: "dmrtl5@hanmail.net" },
  { externalUnitId: 238066, unitNameKo: "대전1 와드", unitNameEn: "Daejeon 1st Ward", role: "감독", name: "정현찬", phone: "010-5119-9493", email: "hcjung99@daum.net" },
  { externalUnitId: 83569, unitNameKo: "목포 와드", unitNameEn: "Mokpo Ward", role: "감독", name: "윤성래", phone: "010-9875-1566", email: "yunsr1978@daum.net" },
  { externalUnitId: 515868, unitNameKo: "창원 스테이크", unitNameEn: "Changwon Stake", role: "스테이크 회장", name: "조용휘", phone: "010-5417-3699", email: "nephi5@naver.com" },
  { externalUnitId: 87963, unitNameKo: "군산 와드", unitNameEn: "Gunsan Ward", role: "감독", name: "정흥열", phone: "010-4321-6128", email: "chad6128@hanmail.net" },
  { externalUnitId: 617008, unitNameKo: "순천 지방부", unitNameEn: "Suncheon District", role: "지방부 회장", name: "송두환", phone: "010-5610-5690", email: "ssdh67@hanmail.net" },
  { externalUnitId: 152447, unitNameKo: "부천 와드", unitNameEn: "Bucheon Ward", role: "감독", name: "김재만", phone: "010-7153-7581", email: "kjm1014@hanmail.net" },
  { externalUnitId: 311162, unitNameKo: "중앙 수어 지부", unitNameEn: "Jungang Sign Language Branch", role: "지부 회장", name: "박수흥", phone: "010-8221-4363", email: "dangunbook@hanmail.net" },
  { externalUnitId: 229776, unitNameKo: "분당 와드", unitNameEn: "Bundang Ward", role: "감독", name: "최명규", phone: "010-3284-0750", email: "mymkok@hotmail.com" },
  { externalUnitId: 512133, unitNameKo: "부산 스테이크", unitNameEn: "Busan Stake", role: "스테이크 회장", name: "김일수", phone: "010-9315-7648", email: "ilsoo.kim@daum.net" },
  { externalUnitId: 280747, unitNameKo: "광양 지부", unitNameEn: "Gwangyang Branch", role: "지부 회장", name: "장봉률", phone: "010-3636-5977", email: "jangbr1129@naver.com" },
  { externalUnitId: 332186, unitNameKo: "의정부 와드", unitNameEn: "Uijeongbu Ward", role: "감독", name: "김형준", phone: "010-5778-5300", email: "james9771@daum.net" },
  { externalUnitId: 301191, unitNameKo: "인천2 와드", unitNameEn: "Incheon 2nd Ward", role: "감독", name: "이민태", phone: "010-7572-5365", email: "ldslmt@hanmail.net" },
  { externalUnitId: 2053403, unitNameKo: "세종 와드", unitNameEn: "Sejong Ward", role: "감독", name: "박영수", phone: "010-6825-9874", email: "ystornado@hanmail.net" },
  { externalUnitId: 197416, unitNameKo: "김제 지부", unitNameEn: "Gimje Branch", role: "지부 회장", name: "박현용", phone: "010-5688-9530", email: "hypark097@gmail.com" },
  { externalUnitId: 301302, unitNameKo: "제주 지부", unitNameEn: "Jeju Branch", role: "지부 회장", name: "안의룡", phone: "010-9366-6915", email: "jteui@naver.com" },
  { externalUnitId: 112593, unitNameKo: "포항 지부", unitNameEn: "Pohang Branch", role: "지부 회장", name: "최원식", phone: "010-3596-2672", email: "chanshikz@gmail.com" },
  { externalUnitId: 280720, unitNameKo: "김해 와드", unitNameEn: "Gimhae Ward", role: "감독", name: "변재선", phone: "010-8617-8903", email: "byon1004@daum.net" },
  { externalUnitId: 72052, unitNameKo: "강북1 와드", unitNameEn: "Gangbuk 1st Ward", role: "감독", name: "정인황", phone: "010-5318-2721", email: "monkey2721@naver.com" },
  { externalUnitId: 539872, unitNameKo: "울산 지방부", unitNameEn: "Ulsan District", role: "지방부 회장", name: "정외곤", phone: "010-3516-6483", email: "dbt6306@naver.com" },
  { externalUnitId: 71870, unitNameKo: "부산 와드", unitNameEn: "Busan Ward", role: "감독", name: "안경일", phone: "010-2242-1931", email: "big-onestar@hanmail.net" },
  { externalUnitId: 83585, unitNameKo: "춘천 와드", unitNameEn: "Chuncheon Ward", role: "감독", name: "문종식", phone: "010-5568-9573", email: "localunit@nate.com" },
  { externalUnitId: 301965, unitNameKo: "제천 지부", unitNameEn: "Jecheon Branch", role: "지부 회장", name: "하현수", phone: "010-2794-1611", email: "ds2kpr@hanmail.net" },
  { externalUnitId: 133671, unitNameKo: "농성 와드", unitNameEn: "Nongseong Ward", role: "감독", name: "노순구", phone: "010-2357-8140", email: "sgknow85@gmail.com" },
  { externalUnitId: 112607, unitNameKo: "순천 지부", unitNameEn: "Suncheon Branch", role: "지부 회장", name: "김동의", phone: "010-5633-9270", email: "koreaman67@empas.com" },
  { externalUnitId: 129321, unitNameKo: "강남1 와드", unitNameEn: "Gangnam 1st Ward", role: "감독", name: "유장철", phone: "010-6210-2100", email: "jcy2100@hanmail.net" },
  { externalUnitId: 301663, unitNameKo: "완산 와드", unitNameEn: "Wansan Ward", role: "감독", name: "이철오", phone: "010-2686-0155", email: "lds-111@daum.net" },
  { externalUnitId: 516198, unitNameKo: "대구 스테이크", unitNameEn: "Daegu Stake", role: "스테이크 회장", name: "이상교", phone: "010-2552-2919", email: "sklee6912@hanmail.net" },
  { externalUnitId: 301507, unitNameKo: "연산 와드", unitNameEn: "Yeonsan Ward", role: "감독", name: "한승룡", phone: "010-5434-7446", email: "ldshsr@naver.com" },
  { externalUnitId: 301752, unitNameKo: "구포 지부", unitNameEn: "Gupo Branch", role: "지부 회장", name: "한성재", phone: "010-7553-7207", email: "ahfhskdl@hanmail.net" },
  { externalUnitId: 89451, unitNameKo: "진해 와드", unitNameEn: "Jinhae Ward", role: "감독", name: "김범수", phone: "010-6780-1349", email: "ganjajjang@naver.com" },
  { externalUnitId: 131334, unitNameKo: "녹번 와드", unitNameEn: "Nokbeon Ward", role: "감독", name: "조해준", phone: "010-9635-1193", email: "lance1598753@gmail.com" },
  { externalUnitId: 83577, unitNameKo: "마산 와드", unitNameEn: "Masan Ward", role: "감독", name: "김봉민", phone: "010-2675-0530", email: "bongminlds@gmail.com" },
  { externalUnitId: 268755, unitNameKo: "상인 와드", unitNameEn: "Sangin Ward", role: "감독", name: "김민수", phone: "010-6239-9796", email: "mssky9796@naver.com" },
  { externalUnitId: 124850, unitNameKo: "Daegu Military Branch", unitNameEn: "Daegu Military Branch", role: "지부 회장", name: "BradleyJosephThomson", phone: "010-4423-9945", email: "bradthomson12@gmail.com" },
  { externalUnitId: 515841, unitNameKo: "경기 스테이크", unitNameEn: "Gyeonggi Stake", role: "스테이크 회장", name: "이혜근", phone: "010-9113-8158", email: "hyekeun0612@hanmail.net" },
  { externalUnitId: 106682, unitNameKo: "광안 와드", unitNameEn: "Gwangan Ward", role: "감독", name: "전영태", phone: "010-4513-7094", email: "jjt204320@naver.com" },
  { externalUnitId: 428698, unitNameKo: "Seoul Branch (English)", unitNameEn: "Seoul Branch (English)", role: "지부 회장", name: "EliHomeroTrejoFlores", phone: "010-2595-2187", email: "elitrejo@gmail.com" },
  { externalUnitId: 94382, unitNameKo: "상당 와드", unitNameEn: "Sangdang Ward", role: "감독", name: "최원창", phone: "010-7941-1939", email: "cb9714@naver.com" },
  { externalUnitId: 301957, unitNameKo: "교문 와드", unitNameEn: "Gyomun Ward", role: "감독", name: "이상철", phone: "010-6718-0024", email: "bethe1004@hotmail.com" },
  { externalUnitId: 509329, unitNameKo: "서울남 스테이크", unitNameEn: "Seoul South Stake", role: "스테이크 회장", name: "권태휘", phone: "010-8836-7251", email: "kwontaehuey@gmail.com" },
  { externalUnitId: 89443, unitNameKo: "여수 지부", unitNameEn: "Yeosu Branch", role: "지부 회장", name: "김태완", phone: "010-6420-8672", email: "kk91519@naver.com" },
  { externalUnitId: 258571, unitNameKo: "첨단 와드", unitNameEn: "Cheomdan Ward", role: "감독", name: "강승진", phone: "010-9238-1039", email: "kj981039@gmail.com" },
  { externalUnitId: 71625, unitNameKo: "수성 와드", unitNameEn: "Suseong Ward", role: "감독", name: "김옥수", phone: "010-5756-6265", email: "kimoksu6265@naver.com" },
  { externalUnitId: 280755, unitNameKo: "이천 와드", unitNameEn: "Icheon Ward", role: "감독", name: "원복상", phone: "010-4730-2500", email: "wonlds9090@naver.com" },
  { externalUnitId: 311073, unitNameKo: "충주 와드", unitNameEn: "Chungju Ward", role: "감독", name: "유영호", phone: "010-7230-9511", email: "yh3390@naver.com" },
  { externalUnitId: 511900, unitNameKo: "서울동 스테이크", unitNameEn: "Seoul East Stake", role: "스테이크 회장", name: "최일광", phone: "010-6244-6850", email: "ilkwangchoi@naver.com" },
  { externalUnitId: 245879, unitNameKo: "해운대 와드", unitNameEn: "Haeundae Ward", role: "감독", name: "김성민", phone: "010-3559-2790", email: "fomin225@daum.net" },
  { externalUnitId: 301523, unitNameKo: "명지 지부", unitNameEn: "Myeongji Branch", role: "지부 회장", name: "안종원", phone: "010-4815-1935", email: "andy112@hanmail.net" },
  { externalUnitId: 280992, unitNameKo: "동해 지부", unitNameEn: "Donghae Branch", role: "지부 회장", name: "신기현", phone: "010-6534-4320", email: "shingihyun@hanmail.net" },
  { externalUnitId: 301310, unitNameKo: "경주 지부", unitNameEn: "Gyeongju Branch", role: "지부 회장", name: "한종우", phone: "010-2275-0227", email: "hjjww@daum.net" },
  { externalUnitId: 280984, unitNameKo: "남원 지부", unitNameEn: "Namwon Branch", role: "지부 회장", name: "이광준", phone: "010-2397-9383", email: "lkjlkjjoon@hanmail.net" },
  { externalUnitId: 142034, unitNameKo: "방어진 지부", unitNameEn: "Bangeojin Branch", role: "지부 회장", name: "유승국", phone: "010-5437-1968", email: "aaronysk@hanmail.net" },
  { externalUnitId: 189499, unitNameKo: "밀양 지부", unitNameEn: "Milyang Branch", role: "지부 회장", name: "박충권", phone: "010-6450-7595", email: "pchu36@naver.com" },
  { externalUnitId: 280224, unitNameKo: "강릉 지부", unitNameEn: "Gangneung Branch", role: "지부 회장", name: "김재경", phone: "010-9205-0542", email: "ldskjk@korea.kr" },
  { externalUnitId: 280712, unitNameKo: "서귀포 지부", unitNameEn: "Seogwipo Branch", role: "지부 회장", name: "윤기포", phone: "010-6303-4332", email: "bubbley@naver.com" },
  { externalUnitId: 131903, unitNameKo: "Northern Military Branch", unitNameEn: "Northern Military Branch", role: "지부 회장", name: "PeterMarkJasinski", phone: "010-4497-4971", email: "pmjasinski@gmail.com" },
  { externalUnitId: 239127, unitNameKo: "경산 지부", unitNameEn: "Gyeongsan Branch", role: "지부 회장", name: "천무철", phone: "010-8986-4151", email: "cmc3973@hanmail.net" },
  { externalUnitId: 280801, unitNameKo: "속초 지부", unitNameEn: "Sokcho Branch", role: "지부 회장", name: "곽태연", phone: "010-5718-1957", email: "bountifulkwak@gmail.com" },
  { externalUnitId: 105201, unitNameKo: "Osan Military Branch", unitNameEn: "Osan Military Branch", role: "지부 회장", name: "ClintonJoeUlmer", phone: "010-2324-8566", email: "cjulmer91@gmail.com" },
  { externalUnitId: 280968, unitNameKo: "나주 지부", unitNameEn: "Naju Branch", role: "지부 회장", name: "강경남", phone: "010-7640-0829", email: "kstar0813@hanmail.net" },
  { externalUnitId: 301337, unitNameKo: "통영 지부", unitNameEn: "Tongyeong Branch", role: "지부 회장", name: "박찬우", phone: "010-5590-9080", email: "pcw328@naver.com" },
  { externalUnitId: 280879, unitNameKo: "온양 지부", unitNameEn: "Onyang Branch", role: "지부 회장", name: "우성환", phone: "010-9588-3498", email: "wsh3498@naver.com" },
  { externalUnitId: 280771, unitNameKo: "서산 지부", unitNameEn: "Seosan Branch", role: "지부 회장", name: "이영제", phone: "010-3430-8928", email: "dudwp0828@gmail.com" },
]

async function run() {
  const batch = db.batch()
  let count = 0
  for (const leader of LEADERS_DATA) {
    const docRef = db.collection('leaders').doc(String(leader.externalUnitId))
    const data: Record<string, unknown> = {
      externalUnitId: leader.externalUnitId,
      unitNameKo: leader.unitNameKo,
      unitNameEn: leader.unitNameEn,
      role: leader.role,
      name: leader.name,
    }
    if (leader.phone) data.phone = leader.phone
    if (leader.email) data.email = leader.email
    batch.set(docRef, data)
    count++
  }
  await batch.commit()
  console.log(`✅ ${count}명 지도자 임포트 완료`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
