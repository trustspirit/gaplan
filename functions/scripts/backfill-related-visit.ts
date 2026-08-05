/**
 * 기존 ward_bishop 모임/접견을 대응하는 ward_visit에 연결한다.
 *
 *   dry-run: npx tsx scripts/backfill-related-visit.ts
 *   실행:    npx tsx scripts/backfill-related-visit.ts --write
 *
 * GOOGLE_APPLICATION_CREDENTIALS 또는 `gcloud auth application-default login` 필요.
 */
import * as admin from 'firebase-admin'
import { matchVisitForMeeting, type BackfillMeeting, type BackfillVisit } from '../src/backfillMatch'

const WRITE = process.argv.includes('--write')

async function main() {
  admin.initializeApp({ projectId: 'gaplan-fccfe' })
  const db = admin.firestore()

  const snap = await db.collection('schedules').get()
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))

  const visits: BackfillVisit[] = docs
    .filter(d => d.type === 'ward_visit' && d.status !== 'cancelled')
    .map(d => ({
      id: d.id,
      seventyUid: d.seventyUid as string,
      date: d.date as string,
      wardId: (d.wardId as string | null) ?? null,
      wardName: (d.wardName as string | null) ?? null,
    }))

  const meetings: BackfillMeeting[] = docs
    .filter(d =>
      (d.type === 'meeting' || d.type === 'interview') &&
      d.targetKind === 'ward_bishop' &&
      d.status !== 'cancelled' &&
      !d.relatedVisitId,
    )
    .map(d => ({
      id: d.id,
      seventyUid: d.seventyUid as string,
      date: d.date as string,
      wardId: (d.wardId as string | null) ?? null,
    }))

  const matched: { meetingId: string; visitId: string }[] = []
  const unmatched: string[] = []

  for (const m of meetings) {
    const visitId = matchVisitForMeeting(m, visits)
    if (visitId) matched.push({ meetingId: m.id, visitId })
    else unmatched.push(m.id)
  }

  console.log(`대상 모임 ${meetings.length}건 / 매칭 ${matched.length}건 / 미매칭 ${unmatched.length}건`)
  for (const { meetingId, visitId } of matched) console.log(`  ${meetingId} -> ${visitId}`)
  if (unmatched.length) console.log('미매칭(수동 연결 필요):', unmatched.join(', '))

  // targetKind/wardId가 없어(CF 배포 누락 등으로) 애초에 자동 매칭 후보에서 빠진 모임/접견.
  // 이 목록은 출력만 한다 — 자동으로 relatedVisitId를 쓰지 않는다. 사람이 직접 확인해야 한다.
  const needsManualReview = docs.filter(d =>
    (d.type === 'meeting' || d.type === 'interview') &&
    d.status !== 'cancelled' &&
    !d.relatedVisitId &&
    d.targetKind !== 'ward_bishop',
  )
  console.log(`\n수동 확인 필요(자동 매칭 대상 아님, targetKind !== 'ward_bishop') ${needsManualReview.length}건`)
  for (const d of needsManualReview) {
    const info = (d.customTitle as string | undefined) ?? (d.unitId as string | undefined) ?? '(정보 없음)'
    console.log(`  ${d.id}  ${d.date as string}  ${info}`)
  }

  if (!WRITE) {
    console.log('\ndry-run 입니다. 실제로 쓰려면 --write 를 붙이세요.')
    return
  }

  const BATCH_SIZE = 500
  for (let i = 0; i < matched.length; i += BATCH_SIZE) {
    const chunk = matched.slice(i, i + BATCH_SIZE)
    const batch = db.batch()
    for (const { meetingId, visitId } of chunk) {
      batch.update(db.collection('schedules').doc(meetingId), { relatedVisitId: visitId })
    }
    await batch.commit()
  }
  console.log(`\n${matched.length}건 기록 완료.`)
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1) })
}
