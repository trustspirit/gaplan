export type VisitPlanStatus = 'draft' | 'published'

export interface VisitPlanItem {
  itemId: string        // 클라이언트 생성 id
  unitId: string        // 스테이크/지방부
  wardName: string      // 마스터 WARDS.name과 일치
  date: string          // YYYY-MM-DD
  startTime: string     // HH:mm
  endTime: string       // HH:mm
  scheduleId?: string   // publish 후 연결된 schedule id
}

export interface VisitPlan {
  id: string
  title: string
  seventyUid: string
  status: VisitPlanStatus
  items: VisitPlanItem[]
  createdBy: string
  createdAt: string
  publishedAt?: string
  projectId?: string     // 연계 프로젝트
}
