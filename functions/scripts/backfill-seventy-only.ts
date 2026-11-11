/**
 * 기존 행사(generalSchedules) 문서에 seventyOnly: false를 채운다.
 *
 * 회장 계정은 where('seventyOnly', '==', false)로 행사를 조회한다(칠십인 전용 행사를
 * 규칙에서 막기 위해서다). Firestore는 필드가 없는 문서를 그 조회에 돌려주지 않으므로,
 * 이 스크립트를 돌리지 않고 배포하면 기존 행사가 회장에게 보이지 않는다.
 * **새 규칙·클라이언트를 배포하기 전에 먼저 실행할 것.**
 *
 *   dry-run: npx tsx scripts/backfill-seventy-only.ts
 *   실행:    npx tsx scripts/backfill-seventy-only.ts --write
 *
 * GOOGLE_APPLICATION_CREDENTIALS 또는 `gcloud auth application-default login` 필요.
 */
import * as admin from 'firebase-admin'

const WRITE = process.argv.includes('--write')

async function main() {
  admin.initializeApp({ projectId: 'gaplan-fccfe' })
  const db = admin.firestore()

  const snap = await db.collection('generalSchedules').get()
  const missing = snap.docs.filter((d) => typeof d.data().seventyOnly !== 'boolean')

  console.log(`행사 ${snap.size}건 중 seventyOnly가 없는 문서 ${missing.length}건`)
  for (const d of missing) console.log(`  ${d.id}  ${d.data().date}  ${d.data().title}`)

  if (!WRITE) {
    console.log('dry-run입니다. 실제로 쓰려면 --write를 붙이세요.')
    return
  }

  // 배치 하나는 500건까지다.
  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch()
    for (const d of missing.slice(i, i + 400)) batch.update(d.ref, { seventyOnly: false })
    await batch.commit()
  }
  console.log(`${missing.length}건을 채웠습니다.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
