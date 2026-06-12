export type LeaderRole = '감독' | '스테이크 회장' | '지방부 회장' | '지부 회장'

export interface Leader {
  id: string           // Firestore 문서 ID (externalUnitId 문자열)
  externalUnitId: number
  unitNameKo: string   // regions.ts와 동일 형식 (메모 매칭에 사용)
  unitNameEn: string
  role: LeaderRole
  name: string         // "조일진"
  phone?: string       // "010-2236-9524"
  email?: string
}
