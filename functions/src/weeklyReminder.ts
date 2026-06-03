import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { getTransport, getSenderEmail } from './emailTransport'
dayjs.extend(isoWeek)

// Every Monday 9am KST (timeZone: Asia/Seoul → cron is in KST)
export const weeklyReminder = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 9 * * 1')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.firestore()
    const weekStart = dayjs().startOf('isoWeek' as dayjs.OpUnitType).format('YYYY-MM-DD')
    const weekEnd = dayjs().endOf('isoWeek' as dayjs.OpUnitType).format('YYYY-MM-DD')

    const snap = await db.collection('schedules')
      .where('status', '==', 'confirmed')
      .where('date', '>=', weekStart)
      .where('date', '<=', weekEnd)
      .get()

    if (snap.empty) return

    const byPresident: Record<string, admin.firestore.QueryDocumentSnapshot[]> = {}
    snap.docs.forEach(d => {
      const uid = d.data().presidentUid
      byPresident[uid] = [...(byPresident[uid] ?? []), d]
    })

    const transport = getTransport()
    const presidentUids = Object.keys(byPresident)

    // Fetch all president user docs in parallel
    const presidentSnaps = await Promise.all(
      presidentUids.map(uid => db.collection('users').doc(uid).get())
    )

    await Promise.all(presidentSnaps.map(async (snap, i) => {
      const president = snap.data()
      if (!president?.email) return
      const uid = presidentUids[i]
      const docs = byPresident[uid]

      const lines = docs.map(d => {
        const s = d.data()
        return `• ${s.date} ${s.startTime} — ${s.type === 'ward_visit' ? '와드 방문' : '접견'}`
      }).join('\n')

      await transport.sendMail({
        from: getSenderEmail(),
        to: president.email,
        subject: `[gaplan] 이번 주 일정 안내 (${weekStart} ~ ${weekEnd})`,
        text: `${president.name} 회장님,\n\n이번 주 확정된 일정입니다:\n\n${lines}\n\ngaplan`,
      })
    }))
  })
