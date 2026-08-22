export interface RelatedVisitDoc {
  type?: string
  seventyUid?: string
  date?: string
  wardName?: string   // 사전 모임 제목이 "<와드> 방문 사전 모임"을 만들 때 쓴다
}

/**
 * 사전 모임 링크(relatedVisitId)의 유효성을 검사한다.
 * 문제가 없으면 null, 있으면 HttpsError 메시지로 쓸 문자열을 돌려준다.
 */
export function validateRelatedVisit(params: {
  scheduleType: string
  scheduleSeventyUid: string
  scheduleDate: string
  visit: RelatedVisitDoc | null
}): string | null {
  const { scheduleType, scheduleSeventyUid, scheduleDate, visit } = params

  if (scheduleType !== 'interview' && scheduleType !== 'meeting') {
    return 'relatedVisitId is only for interview/meeting'
  }
  if (!visit) {
    return 'relatedVisitId does not point to an existing schedule'
  }
  if (visit.type !== 'ward_visit') {
    return 'relatedVisitId must point to a ward_visit'
  }
  if (visit.seventyUid !== scheduleSeventyUid) {
    return 'relatedVisitId must point to a visit of the same seventy'
  }
  if (!visit.date || scheduleDate > visit.date) {
    return 'A pre-visit meeting must not be later than the visit date'
  }
  return null
}
